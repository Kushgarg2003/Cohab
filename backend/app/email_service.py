import resend
from app.database import settings

resend.api_key = settings.RESEND_API_KEY

APP_URL = settings.APP_URL
FROM_EMAIL = settings.FROM_EMAIL


def _send(to: str, subject: str, html: str) -> bool:
    """Fire-and-forget email send. Returns True on success, False on failure."""
    if not settings.RESEND_API_KEY:
        return False
    try:
        resend.Emails.send({
            "from": f"Colocsy <{FROM_EMAIL}>",
            "to": [to],
            "subject": subject,
            "html": html,
        })
        return True
    except Exception as e:
        print(f"[email] Failed to send '{subject}' to {to}: {e}")
        return False


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

def _base_template(content: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Colocsy</title>
  <style>
    body {{ margin: 0; padding: 0; background-color: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e5e5e5; }}
    .wrapper {{ max-width: 560px; margin: 40px auto; background-color: #1a1a1a; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a2a; }}
    .header {{ background: linear-gradient(135deg, #6c47ff 0%, #a855f7 100%); padding: 32px 40px; text-align: center; }}
    .header h1 {{ margin: 0; font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.5px; }}
    .header p {{ margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.7); }}
    .body {{ padding: 36px 40px; }}
    .body h2 {{ margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #fff; }}
    .body p {{ margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #aaa; }}
    .cta {{ display: inline-block; margin: 8px 0 24px; padding: 14px 32px; background: linear-gradient(135deg, #6c47ff, #a855f7); color: #fff; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 600; }}
    .divider {{ height: 1px; background: #2a2a2a; margin: 24px 0; }}
    .footer {{ padding: 0 40px 32px; text-align: center; font-size: 12px; color: #555; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Colocsy</h1>
      <p>Find your perfect roommate, broker-free.</p>
    </div>
    <div class="body">
      {content}
    </div>
    <div class="footer">
      <p>You're receiving this because you signed up at Colocsy.<br/>
      © 2025 Colocsy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# Email senders
# ---------------------------------------------------------------------------

def send_welcome_email(to_email: str, name: str) -> bool:
    first_name = name.split()[0] if name else "there"
    content = f"""
      <h2>Welcome, {first_name}! 👋</h2>
      <p>You're now on Colocsy — the smartest way to find a roommate in India. No brokers. No spam. Just real people looking for a compatible living situation.</p>
      <p>Here's how it works:</p>
      <p>
        <strong style="color:#fff;">1. Fill out your profile survey</strong> — takes about 5 minutes.<br/>
        <strong style="color:#fff;">2. Swipe on potential roommates</strong> — we rank them by compatibility.<br/>
        <strong style="color:#fff;">3. Match &amp; chat</strong> — when it's mutual, a group is created for you both.
      </p>
      <a href="{APP_URL}" class="cta">Complete your profile →</a>
      <div class="divider"></div>
      <p style="font-size:13px;">Got questions? Just reply to this email — we're a small team and we actually read these.</p>
    """
    return _send(to_email, "Welcome to Colocsy 🏠", _base_template(content))


def send_match_email(to_email: str, your_name: str, match_name: str, group_id: str) -> bool:
    first_name = your_name.split()[0] if your_name else "there"
    match_first = match_name.split()[0] if match_name else "someone"
    group_url = f"{APP_URL}/group/{group_id}"
    content = f"""
      <h2>It's a match, {first_name}! 🎉</h2>
      <p>You and <strong style="color:#fff;">{match_name}</strong> both liked each other on Colocsy. A shared group has been created for you.</p>
      <p>Head over to say hi, share your wishlist, and start planning your move together.</p>
      <a href="{group_url}" class="cta">Open your group chat →</a>
      <div class="divider"></div>
      <p style="font-size:13px;">Pro tip: The sooner you reach out, the better the chances of locking in a great place together. Don't let {match_first} wait too long! 😄</p>
    """
    return _send(to_email, f"You matched with {match_name} on Colocsy! 🎉", _base_template(content))
