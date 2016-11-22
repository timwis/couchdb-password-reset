module.exports = Templates

function Templates ({ siteName, constructResetURL, moreInfoURL }) {
  return {
    resetToken,
    notFound
  }

  function resetToken (token) {
    return `
      Hello,

      Follow this link to reset your ${siteName} password for your account.

      ${constructResetURL(token)}

      If you didn’t ask to reset your password, you can ignore this email.

      Thanks,

      The ${siteName} team
    `
  }

  function notFound () {
    return `
      You (or someone else) entered this email address when trying to change the password of an ${siteName} account.

      However, this email address is not in our database of registered users and therefore the attempted password change has failed.

      If you have an ${siteName} account and were expecting this email, please try again using the email address you gave when opening your account.

      If you do not have an ${siteName} account, please ignore this email.

      For information about ${siteName}, visit ${moreInfoURL}.

      Kind regards,

      The ${siteName} team
    `
  }
}
