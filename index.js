const assert = require('assert')
const uuid = require('node-uuid')
const extend = require('xtend')
const createError = require('create-error')
const nano = require('nano')
const postmark = require('postmark')

const UserError = createError('UserError', {statusCode: 400})
const ServerError = createError('ServerError', {statusCode: 500})

module.exports = PasswordReset

function PasswordReset ({
  usersDB,
  postmarkServerToken,
  fromEmail,
  tokenLifespan = 30,
  resetTokenSubject = 'Password reset',
  resetTokenTemplate,
  notFoundSubject = 'Attempted password reset',
  notFoundTemplate
}) {
  assert(usersDB, 'usersDB must be passed')
  assert(fromEmail, 'fromEmail must be passed')
  assert(resetTokenTemplate, 'resetTokenTemplate must be passed')
  assert(notFoundTemplate, 'notFoundTemplate must be passed')

  // Idea: for testing, allow consumers to pass already instantiated db/emailClient
  const db = usersDB.hasOwnProperty('get') ? usersDB : nano(usersDB)
  const emailClient = new postmark.Client(postmarkServerToken)

  return {
    init: initReset,
    confirm: confirmReset
  }

  function initReset (email, cb) {
    if (!email) return cb(new UserError('No email provided'))

    // Find user document
    const viewOpts = { keys: [email], include_docs: true }
    db.view('users', 'byEmail', viewOpts, (err, body) => {
      // If something went wrong while finding (*not* thrown if no doc found)
      if (err) return cb(new ServerError('Error finding user document'))

      if (body.rows.length) {
        // Found user document
        const token = uuid.v4()
        const newUserDoc = extend(body.rows[0].doc)
        newUserDoc.metadata.resetToken = {
          created: Date.now(),
          token
        }

        // Add reset token to user document
        db.insert(newUserDoc, (err, body) => {
          if (err) return cb(new ServerError('Error adding reset token to user document'))

          const emailConfig = {
            From: fromEmail,
            To: email,
            Subject: resetTokenSubject,
            TextBody: resetTokenTemplate(token)
          }

          // Email reset token to user
          emailClient.sendEmail(emailConfig, (err, result) => {
            if (err) return cb(new ServerError('Error sending reset email'))

            cb() // success
          })
        })
      } else {
        // No user found
        const emailConfig = {
          From: fromEmail,
          To: email,
          Subject: notFoundSubject,
          TextBody: notFoundTemplate()
        }

        // Email "not found" notice to user
        emailClient.sendEmail(emailConfig, (err, result) => {
          if (err) return cb(new ServerError('Error sending reset email'))

          cb() // success
        })
      }
    })
  }

  function confirmReset (token, password, cb) {
    if (!token || !password) return cb(new UserError('Token or password missing'))

    const viewOpts = { keys: [token], include_docs: true }
    db.view('users', 'byResetToken', viewOpts, (err, body) => {
      if (err) return cb(new ServerError('Error fetching user document'))
      if (!body.rows.length || isExpired(body.rows[0].value)) {
        return cb(new UserError('Token not found or token is inactive', {statusCode: 404}))
      }

      // User document found with that token
      const newUserDoc = extend(body.rows[0].doc)
      newUserDoc.password = password
      delete newUserDoc.metadata.resetToken

      // Update password and remove reset token from user document
      db.insert(newUserDoc, (err, body) => {
        if (err) cb(new ServerError('Error saving user document'))

        cb() // success
      })
    })
  }

  function isExpired (timestamp) {
    return (Date.now() - timestamp) / 1000 / 60 > tokenLifespan
  }
}
