from analyzer import analyze_text

def test_extracts_key_information():
    result = analyze_text(
        "Final notice: pay $120 by September 14. Please renew your plan. "
        "Email help@example.com."
    )
    assert result["priority"] == "HIGH"
    assert "$120" in result["money"]
    assert "September 14" in result["dates"]
    assert "help@example.com" in result["contacts"]["emails"]
    assert result["actions"]

def test_detects_security_warning():
    result = analyze_text("Click this link and send your OTP to claim $50.")
    assert any("one-time" in warning.lower() for warning in result["warnings"])

def test_emptyish_text_is_safe():
    result = analyze_text("Hello there.")
    assert result["priority"] == "LOW"
    assert result["summary"] == "Hello there."
