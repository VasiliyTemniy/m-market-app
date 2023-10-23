import type { MapToDT, MapToDTN, PropertyGroup } from '@m-cafe-app/utils';
import type { LocStringDT, LocStringDTN } from './LocStringDT';
import type { Facility, FacilityS } from '../domain';
import type { UserDT } from './UserDT.js';
import type { StockDTS } from './StockDT.js';
import { isEntity } from '@m-cafe-app/utils';
import { isAddressDT } from './AddressDT.js';
import { isStockDTS } from './StockDT.js';
import { isUserDT } from './UserDT.js';
import {
  descriptionLocNewProperty,
  descriptionLocProperty,
  idRequired,
  nameLocNewProperty,
  nameLocProperty
} from './validationHelpers.js';


const facilityPropertiesGroups: PropertyGroup[] = [{
  properties: ['address'],
  validator: isAddressDT
}, {
  properties: ['managers'],
  required: false,
  validator: isUserDT,
  isArray: true
}, {
  properties: ['stocks'],
  required: false,
  validator: isStockDTS,
  isArray: true
}];

export type FacilityDT = Omit<MapToDT<Facility>, 'nameLoc' | 'descriptionLoc' | 'managers' | 'stocks'> & {
  nameLoc: LocStringDT;
  descriptionLoc: LocStringDT;
  managers?: UserDT[];
  stocks?: StockDTS[];
};

export const isFacilityDT = (obj: unknown): obj is FacilityDT =>
  isEntity(obj, [ idRequired, nameLocProperty, descriptionLocProperty, ...facilityPropertiesGroups ]);




export type FacilityDTN = Omit<MapToDTN<Facility>, 'nameLoc' | 'descriptionLoc' | 'managers' | 'stocks'> & {
  nameLoc: LocStringDTN;
  descriptionLoc: LocStringDTN;
};

export const isFacilityDTN = (obj: unknown): obj is FacilityDTN =>
  isEntity(obj, [ nameLocNewProperty, descriptionLocNewProperty, { properties: ['address'], validator: isAddressDT } ]);



/**
 * Simple data about Facility contains only nameLoc and descriptionLoc
 */
export type FacilityDTS = Omit<MapToDT<FacilityS>, 'nameLoc' | 'descriptionLoc'> & {
  nameLoc: LocStringDT;
  descriptionLoc: LocStringDT;
};

export const isFacilityDTS = (obj: unknown): obj is FacilityDTS =>
  isEntity(obj, [ idRequired, nameLocProperty, descriptionLocProperty ]);