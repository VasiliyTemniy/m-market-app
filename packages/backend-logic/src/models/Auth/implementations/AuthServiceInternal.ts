import type { JwtPayload } from 'jsonwebtoken';
import type { IAuthService } from '../interfaces';
import { AuthResponse } from '@m-cafe-app/models';
import { AuthorizationError, UnknownError } from '@m-cafe-app/utils';
import jwt from 'jsonwebtoken';
import { isCustomPayload } from '../../../utils';

export class AuthServiceInternal implements IAuthService {
  verifyTokenInternal(token: string, tokenPublicKeyPem: string, issuer: string): AuthResponse {
    
    let payload: JwtPayload | string;

    try {
      payload = jwt.verify(token, tokenPublicKeyPem, { algorithms: ['RS256'], issuer });
    } catch (e) {
      if (e instanceof jwt.JsonWebTokenError) return new AuthResponse(0, '', `AuthorizationError: ${e.message}`);
      throw new UnknownError('Error while verifying token');
    }

    if (typeof payload === 'string' || payload instanceof String || !isCustomPayload(payload))
      throw new AuthorizationError('Malformed token');
  
    return new AuthResponse(payload.id, token, '');
  }
}