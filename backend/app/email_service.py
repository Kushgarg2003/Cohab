import resend
import secrets
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


def get_or_create_unsubscribe_token(user, db) -> str:
    """Return existing unsubscribe token or generate a new one."""
    if not user.unsubscribe_token:
        user.unsubscribe_token = secrets.token_urlsafe(32)
        db.commit()
    return user.unsubscribe_token


def log_email(user_id, email_type: str, subject: str, db):
    """Record a sent email in the email_logs table."""
    from app.models import EmailLog
    db.add(EmailLog(user_id=user_id, email_type=email_type, subject=subject))
    db.commit()


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

def _base_template(content: str, unsubscribe_url: str = None) -> str:
    unsub_html = ""
    if unsubscribe_url:
        unsub_html = f'<p>Don\'t want these emails? <a href="{unsubscribe_url}" style="color:#555;">Unsubscribe</a></p>'
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
      {unsub_html}
    </div>
  </div>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# Email senders — all accept optional db for logging + unsubscribe
# ---------------------------------------------------------------------------

def send_welcome_email(to_email: str, name: str, user=None, db=None) -> bool:
    first_name = name.split()[0] if name else "there"
    unsub_url = f"{APP_URL}/unsubscribe/{get_or_create_unsubscribe_token(user, db)}" if user and db else None
    content = f"""
      <h2>Welcome, {first_name}! 👋</h2>
      <p>You're now on Colocsy — the smartest way to find a roommate, broker-free. Just real people looking for a compatible living situation.</p>
      <p>Here's how it works:</p>
      <p>
        <strong style="color:#fff;">1. Fill out your profile survey</strong> — takes about 5 minutes.<br/>
        <strong style="color:#fff;">2. Swipe on potential roommates</strong> — we rank them by compatibility.<br/>
        <strong style="color:#fff;">3. Match &amp; chat</strong> — when it's mutual, a group is created for you both.
      </p>
      <a href="{APP_URL}/dashboard" class="cta">Complete your profile →</a>
      <div class="divider"></div>
      <p style="font-size:13px;">Got questions? Just reply to this email — we're a small team and we actually read these.</p>
    """
    subject = "Welcome to Colocsy 🏠"
    ok = _send(to_email, subject, _base_template(content, unsub_url))
    if ok and user and db:
        log_email(user.id, "welcome", subject, db)
    return ok


def send_survey_reminder_email(to_email: str, name: str, reminder_number: int, user=None, db=None) -> bool:
    """reminder_number: 1, 2, or 3"""
    first_name = name.split()[0] if name else "there"
    unsub_url = f"{APP_URL}/unsubscribe/{get_or_create_unsubscribe_token(user, db)}" if user and db else None

    if reminder_number == 1:
        subject = f"{first_name}, you signed up but vanished"
        content = f"""
          <h2>Hey {first_name},</h2>
          <p>You signed up for Colocsy but never finished your profile.</p>
          <p>That means right now, people are getting matched near you — and you're not showing up in any of them.</p>
          <p>The survey takes 5 minutes. It's the reason Colocsy works: we match on how you <em>actually</em> live — sleep schedule, cleanliness, whether you cook, work from home, tolerate pets — not just budget and location.</p>
          <p>That's what separates a roommate you'll actually like from a horror story.</p>
          <a href="{APP_URL}/dashboard" class="cta">Complete my profile →</a>
          <div class="divider"></div>
          <p style="font-size:13px;">If you've already moved in somewhere, ignore this. But if you're still looking — 5 minutes now could save you months of stress.</p>
        """
    elif reminder_number == 2:
        subject = f"People are matching on Colocsy — you're missing out, {first_name}"
        content = f"""
          <h2>Still looking for a roommate, {first_name}?</h2>
          <p>Your profile is still incomplete, which means you're invisible to everyone on Colocsy right now.</p>
          <p>Here's what you're missing: people who share your lifestyle, your budget, your sleep schedule. Not a random stranger from a Facebook group — someone actually compatible.</p>
          <p>It takes 5 minutes. That's it.</p>
          <a href="{APP_URL}/dashboard" class="cta">Finish my profile →</a>
          <div class="divider"></div>
          <p style="font-size:13px;">We won't keep nudging you forever — but we'd hate for you to miss a great match.</p>
        """
    else:
        subject = f"Last nudge from us, {first_name}"
        content = f"""
          <h2>One last time, {first_name}.</h2>
          <p>We know your inbox is busy. This is our last reminder about your incomplete Colocsy profile.</p>
          <p>If you're still searching for a roommate — someone compatible, not just affordable — your profile is the only thing standing between you and a good match.</p>
          <p>5 minutes. That's all it takes.</p>
          <a href="{APP_URL}/dashboard" class="cta">Complete my profile →</a>
          <div class="divider"></div>
          <p style="font-size:13px;">After this we'll leave you alone. Promise.</p>
        """

    ok = _send(to_email, subject, _base_template(content, unsub_url))
    if ok and user and db:
        log_email(user.id, f"survey_reminder_{reminder_number}", subject, db)
    return ok


def send_you_have_likes_email(to_email: str, name: str, like_count: int, user=None, db=None) -> bool:
    first_name = name.split()[0] if name else "there"
    unsub_url = f"{APP_URL}/unsubscribe/{get_or_create_unsubscribe_token(user, db)}" if user and db else None
    people = f"{like_count} {'person has' if like_count == 1 else 'people have'}"
    subject_people = f"{like_count} {'person likes' if like_count == 1 else 'people like'}"
    content = f"""
      <h2>{people} liked your profile, {first_name}! 👀</h2>
      <p>Someone on Colocsy thinks you could be a great roommate. Head back and swipe through your matches — your next great living situation might already be waiting for you.</p>
      <p>Don't leave them hanging. The sooner you check, the better the odds of locking in something great.</p>
      <a href="{APP_URL}/matches" class="cta">See who liked you →</a>
      <div class="divider"></div>
      <p style="font-size:13px;">You're receiving this because you have a completed profile on Colocsy.</p>
    """
    subject = f"{subject_people} your profile on Colocsy 👀"
    ok = _send(to_email, subject, _base_template(content, unsub_url))
    if ok and user and db:
        log_email(user.id, "has_likes", subject, db)
    return ok


def send_custom_broadcast_email(to_email: str, name: str, subject: str, body_html: str, user=None, db=None) -> bool:
    first_name = name.split()[0] if name else "there"
    unsub_url = f"{APP_URL}/unsubscribe/{get_or_create_unsubscribe_token(user, db)}" if user and db else None
    content = f"""
      <h2>Hey {first_name},</h2>
      {body_html}
      <div class="divider"></div>
      <p style="font-size:13px;">Questions? Just reply to this email.</p>
    """
    ok = _send(to_email, subject, _base_template(content, unsub_url))
    if ok and user and db:
        log_email(user.id, "custom", subject, db)
    return ok


def send_conversation_nudge_email(to_email: str, name: str, match_name: str, group_id: str, user=None, db=None) -> bool:
    first_name = name.split()[0] if name else "there"
    match_first = match_name.split()[0] if match_name else "your match"
    group_url = f"{APP_URL}/group/{group_id}"
    unsub_url = f"{APP_URL}/unsubscribe/{get_or_create_unsubscribe_token(user, db)}" if user and db else None
    content = f"""
      <h2>Hey {first_name}, {match_first} is waiting 👋</h2>
      <p>You matched with <strong style="color:#fff;">{match_name}</strong> on Colocsy a few days ago — but nobody's said hi yet.</p>
      <p>Great roommate situations don't wait forever. A quick message now could be the start of finding a place you actually love.</p>
      <a href="{group_url}" class="cta">Break the ice →</a>
      <div class="divider"></div>
      <p style="font-size:13px;">It only takes one message. You already matched — the hard part is done.</p>
    """
    subject = f"You matched with {match_name} — nobody's said hi yet"
    ok = _send(to_email, subject, _base_template(content, unsub_url))
    if ok and user and db:
        log_email(user.id, "conversation_nudge", subject, db)
    return ok


def send_match_email(to_email: str, your_name: str, match_name: str, group_id: str, user=None, db=None) -> bool:
    first_name = your_name.split()[0] if your_name else "there"
    match_first = match_name.split()[0] if match_name else "someone"
    group_url = f"{APP_URL}/group/{group_id}"
    unsub_url = f"{APP_URL}/unsubscribe/{get_or_create_unsubscribe_token(user, db)}" if user and db else None
    content = f"""
      <h2>It's a match, {first_name}! 🎉</h2>
      <p>You and <strong style="color:#fff;">{match_name}</strong> both liked each other on Colocsy. A shared group has been created for you.</p>
      <p>Head over to say hi, share your wishlist, and start planning your move together.</p>
      <a href="{group_url}" class="cta">Open your group chat →</a>
      <div class="divider"></div>
      <p style="font-size:13px;">Pro tip: The sooner you reach out, the better the chances of locking in a great place together. Don't let {match_first} wait too long! 😄</p>
    """
    subject = f"You matched with {match_name} on Colocsy! 🎉"
    ok = _send(to_email, subject, _base_template(content, unsub_url))
    if ok and user and db:
        log_email(user.id, "match", subject, db)
    return ok
