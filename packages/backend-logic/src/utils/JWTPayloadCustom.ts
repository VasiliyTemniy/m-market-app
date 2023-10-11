import type { JwtPayload } from 'jsonwebtoken';
import { hasOwnProperty } from '@m-cafe-app/utils';

export interface JwtPayloadCustom extends JwtPayload {
  id: number;
}

export const isCustomPayload = (payload: JwtPayload): payload is JwtPayloadCustom =>
  hasOwnProperty(payload, 'id');