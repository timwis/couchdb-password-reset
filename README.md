# CouchDB Password Reset
Password reset implementation for CouchDB. **Work in progress**

## Usage
```javascript
const http = require('http')
const jsonBody = require('body/json')
const PasswordReset = require('couchdb-password-reset')
const Templates = reqiure('couchdb-password-reset/templates')

// Optionally use included templates by providing them basic info
const templates = Templates({
  siteName: 'My Site',
  constructResetURL: (token) => 'http://mysite.com/password-reset' + token,
  moreInfoURL: 'http://mysite.com/about'
})

const passwordReset = PasswordReset({
  dbURL: 'http://localhost:5984/_users',
  postmarkServerToken: 'as0d98fasd0f',
  fromEmail: 'noreply@site.com',
  resetTokenTemplate: templates.resetToken,
  notFoundTemplate: templates.notFound
})

http.createServer((req, res) => {
  switch (req.url) {
    case '/reset/init': return (req, res) => {
      jsonBody(req, (err, body) => {
        const email = body.email
        passwordReset.init(email, (err) => {
          if (err) res.statusCode = err.statusCode
          res.end()
        })
      })
    }
    case '/reset/confirm': return (req, res) => {
      jsonBody(req, (err, body) => {
        const token = body.token
        const password = body.password
        passwordReset.confirm(token, password, (err) => {
          if (err) res.statusCode = err.statusCode
          res.end()
        })
      })
    }
  }
}).listen(8080)

```
