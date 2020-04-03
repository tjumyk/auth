import os
import re
import smtplib
import time
from email.headerregistry import Address
from email.message import EmailMessage
from subprocess import Popen, PIPE
from typing import List

from flask import current_app as app

_templates = {}


def _build_address_list(recipient_list: list) -> List[Address]:
    addresses = []
    for name, email in recipient_list:
        to_user, to_domain = email.split('@', 1)
        addresses.append(Address(name, to_user, to_domain))
    return addresses


def send_email(to_name, to_email, template, **kwargs):
    send_emails([(to_name, to_email)], [], [], template, **kwargs)


def send_emails(to_list, cc_list, bcc_list, template, **kwargs):
    mail_config = app.config['MAIL']

    msg = EmailMessage()
    from_user, from_domain = mail_config['from'].split('@', 1)
    from_name = mail_config['display_name']

    reply_to = None  # a [name, email] tuple for Reply-To header
    sender = kwargs.get('sender')
    if sender:  # if sender is specified, it's a personal email.
        sender_display_name = sender.nickname or sender.name
        from_name = '%s via %s' % (sender_display_name, from_name)
        if sender.email:
            reply_to = sender_display_name, sender.email
    else:  # Otherwise, it's a system email.
        # check if a global 'Reply-To' is configured
        reply_to_address = mail_config.get('reply_to')
        if reply_to_address:
            reply_to_name = mail_config.get('reply_to_name') or ''
            reply_to = reply_to_name, reply_to_address

    msg['From'] = Address(from_name, from_user, from_domain)
    if reply_to:
        reply_to_name, reply_to_address = reply_to
        reply_to_user, reply_to_domain = reply_to_address.split('@', 1)
        msg['Reply-To'] = Address(reply_to_name, reply_to_user, reply_to_domain)

    if to_list:
        msg['To'] = _build_address_list(to_list)
    if cc_list:
        msg['Cc'] = _build_address_list(cc_list)
    if bcc_list:
        msg['Bcc'] = _build_address_list(bcc_list)

    if template:
        temp = _templates.get(template)
        if temp is None:
            temp = {}
            txt_path = os.path.join('mail_templates', template + '.txt')
            html_path = os.path.join('mail_templates', template + '.html')
            with open(txt_path) as f_txt:
                txt = f_txt.read()
                temp['subject'], temp['text'] = txt.split('\n', 1)
            if os.path.isfile(html_path):
                with open(html_path) as f_html:
                    temp['html'] = f_html.read()
            _templates[template] = temp

        msg['Subject'] = temp['subject'].format(**kwargs)
        msg.set_content(temp['text'].format(**kwargs))
        temp_html = temp.get('html')
        if temp_html:
            # In html templates, double curly-braces are used for string interpolation to avoid conflict with css and js
            # functions
            html = re.sub(r"(\{\{[^}]+\}\})", lambda m: m.group(1)[1:-1].format(**kwargs), temp_html)
            msg.add_alternative(html, subtype='html')
    else:
        msg['Subject'] = kwargs.get('subject', '<No Subject>')
        msg.set_content(kwargs.get('body', '<No Body>'))

    # use mock folder?
    mock_folder = mail_config.get('mock_folder')
    if mock_folder:
        for name, email in to_list:
            folder = os.path.join(mock_folder, email)
            if not os.path.isdir(folder):
                os.makedirs(folder)
            with open(os.path.join(folder, '%f.txt' % time.time()), 'w') as f:
                f.write("From: %s\nSubject: %s\n\n%s" % (str(msg['From']), msg['Subject'], msg.get_body()))
        return

    # use mail catcher? (https://github.com/sj26/mailcatcher)
    mail_catcher_config = mail_config.get('mail_catcher')
    if mail_catcher_config:
        with smtplib.SMTP(host=mail_catcher_config.get('host'), port=mail_catcher_config.get('port')) as smtp:
            smtp.send_message(msg)
        return

    # use sendmail directly
    p = Popen(["/usr/sbin/sendmail", "-t", "-oi"], stdin=PIPE)
    p.communicate(msg.as_bytes())
