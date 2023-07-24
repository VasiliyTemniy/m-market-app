import {
  alphabetAll,
  alphabetEn,
  getRandomElement,
  nameChars,
  numbers,
  possibleChars,
  usernameChars
} from './test_helper';

export const initialUsers = [
  {
    username: "Vasisualiy",
    name: "Mikhail Dyachenko",
    //password: "IputThisEverywhere",
    passwordHash: "$2a$10$ofK5pjq4S7.Df5H4LXkVfuNpRWXG51oF4mNXI8heuthC0vTFlRbSe",
    phonenumber: "88003561256"
  },
  {
    username: "flash_us",
    name: "Ilja Dyachenko",
    //password: "3654theRealData2412",
    passwordHash: "$2a$10$kO1TOacajXmBd463xhyd6uxTqBayJOeOdOwRtkfzms7l2mtf6yCT.",
    phonenumber: "88003561277"
  },
  {
    username: "StevieDoesntKnow",
    name: "Steve Miller",
    //password: "AbraAbra_cadabra",
    passwordHash: "$2a$10$exzJXbj/hbO6jS.2rzkz8.Gq6.VSq6X8w7vl7C1jkTgcFOnB/7beW",
    phonenumber: "88003561288",
    birthdate: new Date('2001-07-23T07:31:03.242Z')
  },
  {
    username: "Poperdopeler",
    name: "Vasisualiy Edipstein",
    //password: "IputThisEverywhere",
    passwordHash: "$2a$10$ofK5pjq4S7.Df5H4LXkVfuNpRWXG51oF4mNXI8heuthC0vTFlRbSe",
    phonenumber: "88003561294",
    email: 'my-emah@jjjjppp.com'
  },
  {
    username: "FanstasmagoR",
    name: "Hren Petrovich",
    //password: "3654theRealData2412",
    passwordHash: "$2a$10$kO1TOacajXmBd463xhyd6uxTqBayJOeOdOwRtkfzms7l2mtf6yCT.",
    phonenumber: "88003561227"
  },
  {
    username: "utopia_Forever",
    //password: "AbraAbra_cadabra",
    passwordHash: "$2a$10$exzJXbj/hbO6jS.2rzkz8.Gq6.VSq6X8w7vl7C1jkTgcFOnB/7beW",
    phonenumber: "88003561211"
  },
  {
    username: "gollum",
    //password: "IputThisEverywhere",
    passwordHash: "$2a$10$ofK5pjq4S7.Df5H4LXkVfuNpRWXG51oF4mNXI8heuthC0vTFlRbSe",
    phonenumber: "88003561226",
    birthdate: new Date('2001-07-23T07:31:03.242Z')
  },
  {
    username: "OW_YEAH",
    //password: "3654theRealData2412",
    passwordHash: "$2a$10$kO1TOacajXmBd463xhyd6uxTqBayJOeOdOwRtkfzms7l2mtf6yCT.",
    phonenumber: "88003561236",
    email: 'my-email@jjjjppp.com',
  },
  {
    username: "fantasy",
    //password: "AbraAbra_cadabra",
    passwordHash: "$2a$10$exzJXbj/hbO6jS.2rzkz8.Gq6.VSq6X8w7vl7C1jkTgcFOnB/7beW",
    phonenumber: "88003561293"
  }
];

export const validNewUserFull = {
  username: 'Petro',
  name: 'Vasilenko Pyotr Ivanovich',
  password: 'iwannabeahero',
  phonenumber: '89354652288',
  email: 'my-email.vah@jjjjppp.com',
  birthdate: '2001-07-23T07:31:03.242Z',
};


// CHECK REGEX BEFORE USE!
// Written for /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/
export const genCorrectUsername = (
  minLen: number,
  maxLen: number
): string => {

  const len = Math.random() * (maxLen - minLen) + minLen;

  let username = getRandomElement(alphabetEn);

  const specialCharSet = new Set([' ', '_', '-']);

  for (let i = 1; i < len - 1; i++) {
    if (specialCharSet.has(username[username.length - 1]))
      username += getRandomElement(alphabetEn);
    else
      username += getRandomElement(usernameChars);
  }

  username += getRandomElement(alphabetEn);

  return username;
};

// CHECK REGEX BEFORE USE!
// Written for /^[A-Za-zА-Яа-я]+(?:[ ][A-Za-zА-Яа-я]+)*$/
export const genCorrectName = (
  minLen: number,
  maxLen: number
): string => {

  const len = Math.random() * (maxLen - minLen) + minLen;

  let name = getRandomElement(alphabetAll);

  for (let i = 1; i < len - 1; i++) {
    if (name[name.length - 1] === ' ')
      name += getRandomElement(alphabetAll);
    else
      name += getRandomElement(nameChars);
  }

  name += getRandomElement(alphabetAll);

  return name;
};


// Written for Soyuz Nezavisimikh Gosudarstv phonenumbers
const phonenumberFirstGroup = ['', '8', '+7', '+374', '+994', '+995', '+375', '+380', '+38', '+996', '+996', '+993'];
// CHECK REGEX BEFORE USE!
// Written for /^((8|\+374|\+994|\+995|\+375|\+7|\+380|\+38|\+996|\+998|\+993)[- ]?)?\(?\d{3,5}\)?[- ]?\d{1}[- ]?\d{1}[- ]?\d{1}[- ]?\d{1}[- ]?\d{1}(([- ]?\d{1})?[- ]?\d{1})?$/;
export const genCorrectPhonenumber = (): string => {

  let phonenumber = getRandomElement(phonenumberFirstGroup);

  if (phonenumber.length > 0) phonenumber += getRandomElement([' ', '-']);

  if (Math.round(Math.random())) phonenumber += '(';

  for (let i = 0; i < Math.random() * 2 + 3; i++) {
    phonenumber += getRandomElement(numbers);
  }

  if (Math.round(Math.random())) phonenumber += ')';

  for (let i = 0; i < Math.random() * 2 + 5; i++) {
    if (Math.round(Math.random())) phonenumber += getRandomElement([' ', '-']);
    phonenumber += getRandomElement(numbers);
  }

  return phonenumber;
};

export const genCorrectEmail = (
  minLen: number,
  maxLen: number
): string => {

  const len = Math.random() * (maxLen - minLen) + minLen;

  let email = '';

  for (let i = 0; i < (Math.random() * (len - 6) + 1); i++) {
    email += getRandomElement(alphabetAll);
  }

  email += '@';

  for (let i = 0; i < (Math.random() * (len - 4 - email.length) + 1); i++) {
    email += getRandomElement(alphabetAll);
  }

  email += '.';

  for (let i = email.length; i < len; i++) {
    email += getRandomElement(alphabetAll);
  }

  return email;
};

export interface IncorrectString {
  result: string,
  errors: string[];
}

export const genIncorrectString = (
  field: string,
  regExp: RegExp,
  minLen: number,
  maxLen: number
): IncorrectString => {

  let errors: string[] = [];
  const len = Math.round(Math.random() * 50 + 1);
  if (!(minLen <= len && len <= maxLen)) errors = [...errors, `Validation len on ${field} failed`];

  let result: string = '';

  for (let i = 0; i < len; i++) {
    result += getRandomElement(possibleChars);
  }

  // if (!(regExp.test(result))) errors = [...errors, `Validation is${checkDate ? 'Date' : ''} on ${field} failed`];
  if (!(regExp.test(result))) errors = [...errors, `Validation is on ${field} failed`];

  return {
    result,
    errors
  };
};