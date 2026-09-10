import re

MONTHS = ('january|february|march|april|may|june|july|august|september|october|november|december')
ACTION_PATTERNS = [r'\b(?:please\s+)?(?:submit|pay|reply|respond|renew|register|complete|upload|download|contact|call|email|confirm|verify|sign|schedule|attend|bring|send|provide|review|update|cancel|book|apply)\b[^.!?\n]{0,120}']
RISK_WORDS = {'urgent':3,'immediately':3,'overdue':3,'penalty':3,'deadline':2,'expires':2,'suspend':3,'suspended':3,'late fee':3,'fraud':4,'scam':4,'warning':2,'legal action':4,'final notice':4,'security':2}
HIGH_SIGNAL = ('urgent','immediately','overdue','final notice','legal action','suspended')
MED_SIGNAL = ('deadline','expires','warning','renew','due')

def _clean(s): return re.sub(r'\s+', ' ', s).strip(' -–—:;,.')

def _extract_dates(text):
    patterns=[rf'\b(?:{MONTHS})\s+\d{{1,2}}(?:st|nd|rd|th)?(?:,\s+\d{{4}})?\b',r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b',r'\b(?:today|tomorrow|tonight|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b']
    found=[]
    for p in patterns: found.extend(re.findall(p,text,flags=re.I))
    return list(dict.fromkeys(found))[:12]

def _extract_money(text):
    patterns=[r'(?:[$€£₹]\s?\d[\d,]*(?:\.\d{1,2})?)',r'(?:\d[\d,]*(?:\.\d{1,2})?\s?(?:USD|EUR|GBP|INR|dollars?|euros?|pounds?))']
    found=[]
    for p in patterns: found.extend(re.findall(p,text,flags=re.I))
    return list(dict.fromkeys(found))[:12]

def _extract_contacts(text):
    emails=re.findall(r'\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b',text,flags=re.I)
    phones=re.findall(r'(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)',text)
    return {'emails':list(dict.fromkeys(emails))[:8],'phones':list(dict.fromkeys([_clean(x) for x in phones]))[:8]}

def _extract_actions(text):
    actions=[]
    for pattern in ACTION_PATTERNS:
        for match in re.finditer(pattern,text,flags=re.I):
            candidate=_clean(match.group(0))
            if len(candidate)>=5: actions.append(candidate)
    for line in text.splitlines():
        line=_clean(line)
        if re.match(r'^(please\s+)?(?:remember|make sure|do not|don\'t|must|need to)\b',line,re.I): actions.append(line)
    unique=[]; seen=set()
    for action in actions:
        key=action.lower()
        if key not in seen: seen.add(key); unique.append(action)
    return unique[:10]

def _score(text,dates,money,actions):
    lower=text.lower(); score=0; reasons=[]
    for phrase,weight in RISK_WORDS.items():
        if phrase in lower: score+=weight; reasons.append(phrase)
    if dates: score+=1
    if actions: score+=min(3,len(actions))
    if money: score+=1
    if any(x in lower for x in HIGH_SIGNAL) or score>=7: level='HIGH'
    elif any(x in lower for x in MED_SIGNAL) or score>=3: level='MEDIUM'
    else: level='LOW'
    return level,score,list(dict.fromkeys(reasons))[:8]

def _summary(text):
    sentences=[s.strip() for s in re.split(r'(?<=[.!?])\s+',_clean(text)) if s.strip()]
    if not sentences: return ''
    signals=('deadline','due','expires','pay','submit','renew','warning','please')
    for sentence in sentences[:8]:
        if any(word in sentence.lower() for word in signals): return sentence[:260]
    return sentences[0][:260]

def analyze_text(text):
    dates=_extract_dates(text); money=_extract_money(text); contacts=_extract_contacts(text); actions=_extract_actions(text)
    level,score,reasons=_score(text,dates,money,actions)
    warnings=[]; lower=text.lower()
    if re.search(r'\b(?:password|one[- ]time password|otp|verification code)\b',lower): warnings.append('Never share passwords or one-time verification codes.')
    if re.search(r'\b(?:wire|crypto|gift card|send money)\b',lower) and money: warnings.append('Money-transfer language is present. Verify the recipient independently.')
    if re.search(r'\b(?:click|open)\s+(?:this\s+)?link\b',lower): warnings.append('Verify links and the sender before opening anything.')
    if level=='HIGH': warnings.append('High-priority signals were detected. Verify the source before acting.')
    return {'priority':level,'score':score,'summary':_summary(text),'actions':actions,'dates':dates,'money':money,'contacts':contacts,'signals':reasons,'warnings':list(dict.fromkeys(warnings)),'privacy_note':"Your scan image is stored in this browser's local storage on this device. The OCR text is sent to this local app only for analysis."}
