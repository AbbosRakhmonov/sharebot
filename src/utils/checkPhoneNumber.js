const checkPhoneNumber = (phoneNumber) => {
  let regex = /^99833/;

  return regex.test(phoneNumber);
}

module.exports = checkPhoneNumber