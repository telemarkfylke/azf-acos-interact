const { default: axios } = require('axios')

/**
 * 
 * @param {Array} emailTo 
 * @param {Array} cc 
 * @param {Array} bcc 
 * @param {String} subject 
 * @param {Array} attachments | Array og objects with properties
 * @param {String} body | Body of the email must be in html format
 */

const composeMailBody = (emailTo, subject, body, attachments, cc, bcc) => {
  if (!emailTo || !Array.isArray(emailTo) || emailTo.length === 0) {
    throw new Error('To field must be a non-empty array')
  }
  if (!subject || typeof subject !== 'string') {
    throw new Error('Subject must be a non-empty string')
  }
  if (!body || typeof body !== 'string') {
    throw new Error('Body must be a non-empty string')
  }

  return {
    "from": "noreply@telemarkfylke.no",
    "to": emailTo,
    "cc": cc || [],
    "bcc": bcc || [],
    "subject": subject,
    "html": body,
    "attachments": attachments || [], // Add object with properties: data (in b64-format), name (filename), type (mime-type ex text/plain, application/pdf, image/png etc)
  }
}

/**
  * @param {Array} emailTo | Array of email addresses to send the email to
  * @param {String} subject | Subject of the email
  * @param {String} body | Body of the email must be in HTML format
  * @param {Array} attachments | Array of attachment objects with properties: data (in b64-format), name (filename), type (mime-type ex text/plain, application/pdf, image/png etc)
  * @param {Array} cc | Array of email addresses to send a carbon copy (CC) to
  * @param {Array} bcc | Array of email addresses to send a blind carbon copy (BCC) to
 */

const sendEmail = async (emailTo, subject, body, attachments, cc, bcc) => {
  // console.log("Emailinfo:", composeMailBody(emailTo, subject, body, attachments, cc, bcc))
  // console.log(process.env.SMTPETER_MAIL_URL, process.env.SMTPETER_MAIL_X_FUNCTIONS_KEY)
  const sendEmail = await axios.post(process.env.SMTPETER_MAIL_URL, composeMailBody(emailTo, subject, body, attachments, cc, bcc), {
    headers: {
      'Content-Type': 'application/json',
      'x-functions-key': process.env.SMTPETER_MAIL_X_FUNCTIONS_KEY
    }
  })
  if (sendEmail.status !== 200) {
    throw new Error(`Failed to send email: ${sendEmail.status} - ${sendEmail.statusText}`)
  }
  console.log("Email sent successfully")
}

module.exports = {
  sendEmail
}


