import type {
  AuthDTRequest,
  AuthDTURequest,
  AuthResponse,
  CredentialsRequest,
  RefreshTokenRequest,
  VerifyResponse,
  VerifyTokenRequest
} from '@m-market-app/models';
import type { IAuthController, IAuthService } from '../interfaces';
import type { AuthServiceClient } from '../../../external';
import type { IAuthConnectionHandler } from '../infrastructure';
import { isAuthDTResponse } from '@m-market-app/models';
import { ApplicationError, GrpcClientError, isBoolean, isString } from '@m-market-app/utils';

export class AuthController implements IAuthController {

  private authServiceExternal: AuthServiceClient | undefined = undefined;
  private tokenPublicKeyPem: string = '';

  constructor(
    private readonly authConnectionHandler: IAuthConnectionHandler,
    private readonly authServiceInternal: IAuthService
  ) {
    // This helps to resolve problem with supertest wrapping instance of AuthController in express app
    // Supertest somehow creates another instance of AuthController that I cannot control
    // In case of dev or prod env, I prefer to manually call getPublicKey() from express app initializer
    if (process.env.NODE_ENV === 'test' && !this.tokenPublicKeyPem) {
      void this.getPublicKey();
    }
  }

  getAll(): Promise<void> {
    throw new ApplicationError('Method not implemented.');
  }

  getById(): Promise<void> {
    throw new ApplicationError('Method not implemented.');
  }

  async connect(): Promise<void> {
    await this.authConnectionHandler.connect();
    this.authServiceExternal = this.authConnectionHandler.authService;
  }

  async ping(): Promise<void> {
    await this.authConnectionHandler.ping();
  }

  async close(): Promise<void> {
    await this.authConnectionHandler.close();
  }

  async create(req: AuthDTRequest): Promise<AuthResponse> {
    if (!this.authServiceExternal) {
      await this.connect();
      return this.create(req);
    }

    const { id, lookupHash, password, ttl } = req;

    return new Promise<AuthResponse>((resolve, reject) => {
      this.authServiceExternal?.createAuth({ id, lookupHash, password, ttl }, 
        (err, response) => {
          if (err)
            return reject(new GrpcClientError(err.message));
          if (!isAuthDTResponse(response))
            return reject(new GrpcClientError('Invalid response from external service'));

          const realResponse: AuthResponse = {
            id: Number(response.id),
            token: response.token,
            error: response.error
          };

          resolve(realResponse);
        }
      );
    });
  }

  async update(req: AuthDTURequest): Promise<AuthResponse> {
    if (!this.authServiceExternal) {
      await this.connect();
      return this.update(req);
    }
    
    const { id, lookupHash, oldPassword, newPassword, ttl } = req;

    return new Promise<AuthResponse>((resolve, reject) => {
      this.authServiceExternal?.updateAuth({ id, lookupHash, oldPassword, newPassword, ttl }, 
        (err, response) => {
          if (err)
            return reject(new GrpcClientError(err.message));
          if (!isAuthDTResponse(response))
            return reject(new GrpcClientError('Invalid response from external service'));

          const realResponse: AuthResponse = {
            id: Number(response.id),
            token: response.token,
            error: response.error
          };

          resolve(realResponse);
        }
      );
    });
  }

  async grant(req: AuthDTRequest): Promise<AuthResponse> {
    if (!this.authServiceExternal) {
      await this.connect();
      return this.grant(req);
    }
    
    const { id, lookupHash, password, ttl } = req;

    return new Promise<AuthResponse>((resolve, reject) => {
      this.authServiceExternal?.grantAuth({ id, lookupHash, password, ttl }, 
        (err, response) => {
          if (err)
            return reject(new GrpcClientError(err.message));
          if (!isAuthDTResponse(response))
            return reject(new GrpcClientError('Invalid response from external service'));

          const realResponse: AuthResponse = {
            id: Number(response.id),
            token: response.token,
            error: response.error
          };

          resolve(realResponse);
        }
      );
    });
  }

  async verifyCredentials(req: CredentialsRequest): Promise<VerifyResponse> {
    if (!this.authServiceExternal) {
      await this.connect();
      return this.verifyCredentials(req);
    }
    
    const { lookupHash, password } = req;

    return new Promise<VerifyResponse>((resolve, reject) => {
      this.authServiceExternal?.verifyCredentials({ lookupHash, password }, 
        (err, response) => {
          if (err)
            return reject(new GrpcClientError(err.message));
          if (!response)
            return reject(new GrpcClientError('No response from external service'));
          if (!isBoolean(response.success) || !isString(response.error))
            return reject(new GrpcClientError('Invalid response from external service'));

          const realResponse: VerifyResponse = {
            success: response.success,
            error: response.error
          };

          resolve(realResponse);
        }
      );
    });
  }

  async verifyToken(req: VerifyTokenRequest): Promise<AuthResponse> {
    if (!this.authServiceExternal) {
      await this.connect();
      return this.verifyToken(req);
    }
    
    const { token } = req;

    return new Promise<AuthResponse>((resolve, reject) => {
      this.authServiceExternal?.verifyToken({ token }, 
        (err, response) => {
          if (err)
            return reject(new GrpcClientError(err.message));
          if (!isAuthDTResponse(response))
            return reject(new GrpcClientError('Invalid response from external service'));

          const realResponse: AuthResponse = {
            id: Number(response.id),
            token: response.token,
            error: response.error
          };

          resolve(realResponse);
        }
      );
    });
  }

  verifyTokenInternal(req: VerifyTokenRequest): AuthResponse {
    
    const { token } = req;

    if (!this.authServiceInternal.verifyTokenInternal)
      throw new ApplicationError('Method not implemented, please use external service');

    if (!this.tokenPublicKeyPem)
      throw new ApplicationError('tokenPublicKeyPem was not initialized');

    return this.authServiceInternal.verifyTokenInternal(token, this.tokenPublicKeyPem, 'simple-micro-auth');
  }

  async refreshToken(req: RefreshTokenRequest): Promise<AuthResponse> {
    if (!this.authServiceExternal) {
      await this.connect();
      return this.refreshToken(req);
    }
    
    const { token, ttl } = req;

    return new Promise<AuthResponse>((resolve, reject) => {
      this.authServiceExternal?.refreshToken({ token, ttl }, 
        (err, response) => {
          if (err)
            return reject(new GrpcClientError(err.message));
          if (!isAuthDTResponse(response))
            return reject(new GrpcClientError('Invalid response from external service'));

          const realResponse: AuthResponse = {
            id: Number(response.id),
            token: response.token,
            error: response.error
          };

          resolve(realResponse);
        }
      );
    });
  }

  async getPublicKey(): Promise<void> {
    if (!this.authServiceExternal) {
      await this.connect();
      return this.getPublicKey();
    }

    return new Promise<void>((resolve, reject) => {
      this.authServiceExternal?.getPublicKey({ target: 'token' },
        (err, response) => {
          if (err)
            return reject(new GrpcClientError(err.message));
          if (!response)
            return reject(new GrpcClientError('No response from external service'));
          if (response.error)
            return reject(new GrpcClientError(response.error));
          if (!response.publicKey)
            return reject(new GrpcClientError('Invalid response from external service'));

          const b64_publicKey = response.publicKey.toString('base64');
          const pemKey = `
-----BEGIN PUBLIC KEY-----
${b64_publicKey}
-----END PUBLIC KEY-----
`;

          this.tokenPublicKeyPem = pemKey;
          resolve();
        }
      );
    });
  }

  async remove(req: { lookupHash: string }): Promise<{ error: string }> {
    if (!this.authServiceExternal) {
      await this.connect();
      return this.remove(req);
    }

    const { lookupHash } = req;

    return new Promise<{ error: string }>((resolve, reject) => {
      this.authServiceExternal?.deleteAuth({ lookupHash }, 
        (err, response) => {
          if (err)
            return reject(new GrpcClientError(err.message));
          if (!response)
            return reject(new GrpcClientError('No response from external service'));
          if (!isString(response.error))
            return reject(new GrpcClientError('Invalid response from external service'));

          const realResponse: { error: string } = {
            error: response.error
          };
        
          resolve(realResponse);
        }
      );
    });
  }

  async flushExternalDB(): Promise<{ error: string }> {
    if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development')
      throw new ApplicationError('Attempt to flush DB in prod!');

    if (!this.authServiceExternal) {
      await this.connect();
      return this.flushExternalDB();
    }

    return new Promise<{ error: string }>((resolve, reject) => {
      this.authServiceExternal?.FlushDB({ reason: 'test' },
        (err, response) => {
          if (err)
            return reject(new GrpcClientError(err.message));
          if (!response)
            return reject(new GrpcClientError('No response from external service'));
          if (!isString(response.error))
            return reject(new GrpcClientError('Invalid response from external service'));

          const realResponse: { error: string } = {
            error: response.error
          };

          resolve(realResponse);
        }
      );
    });
  }
}