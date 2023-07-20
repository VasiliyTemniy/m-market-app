import { parseString } from "./typeParsers";

type CheckFromApiFields = {
  message: unknown;
};

export type CheckFromApi = {
  message: string;
};

const hasCheckFromApiFields = (obj: unknown): obj is CheckFromApiFields => 
  Object.prototype.hasOwnProperty.call(obj, 'message');

export const pingValidator = (check: unknown): CheckFromApi => {

  if (hasCheckFromApiFields(check)) {
    const checkTV: CheckFromApi = {
      message: parseString(check.message),
    };
    return checkTV; // TV means Type Valid or Type Validated
  } else {
    throw new Error('Invalid check response');
  }

};