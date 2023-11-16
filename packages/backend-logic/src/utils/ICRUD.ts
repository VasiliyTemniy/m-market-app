/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response } from 'express';
import type { GenericTransaction } from './ITransactionHandler.js';

export interface ICRUDRepo<T, DTN> {
  getAll(): Promise<T[]>;
  getById(id: number): Promise<T>;
  create(dtn: DTN, transaction?: GenericTransaction, ...args: any): Promise<T>;
  update(d: T, transaction?: GenericTransaction, ...args: any): Promise<T>;
  remove(id: number, transaction?: GenericTransaction): Promise<void> | Promise<T>;
  removeAll(transaction?: GenericTransaction): Promise<void>;
  createMany?(dtns: DTN[], transaction?: GenericTransaction, ...args: any): Promise<T[]>;
  updateMany?(ds: T[], transaction?: GenericTransaction, ...args: any): Promise<T[]>;
  removeMany?(ids: number[], transaction?: GenericTransaction, ...args: any): Promise<void>;
}

export interface ICRUDService<DT, DTN> {
  getAll(): Promise<DT[]>;
  getById(id: number): Promise<DT>;
  create(dtn: DTN, ...args: any): Promise<DT>;
  update(dt: DT, ...args: any): Promise<DT>;
  remove(id: number): Promise<void> | Promise<DT>;
  removeAll(): Promise<void>;
  createMany?(dtns: DTN[]): Promise<DT[]>;
  updateMany?(dts: DT[]): Promise<DT[]>;
  removeMany?(ids: number[]): Promise<void>;
}

export interface ICRUDController {
  getAll(...args: any): Promise<any>;
  getById(...args: any): Promise<any>;
  create?(...args: any): Promise<any>;
  update?(...args: any): Promise<any>;
  remove?(...args: any): Promise<any>;
  createMany?(...args: any): Promise<any>;
  updateMany?(...args: any): Promise<any>;
  removeMany?(...args: any): Promise<any>;
}

export interface ICRUDControllerHttp extends ICRUDController {
  getAll(req: Request, res: Response, ...args: any): Promise<void>;
  getById(req: Request, res: Response, ...args: any): Promise<void>;
  create?(req: Request, res: Response, ...args: any): Promise<void>;
  update?(req: Request, res: Response, ...args: any): Promise<void>;
  remove?(req: Request, res: Response, ...args: any): Promise<void>;
  createMany?(req: Request, res: Response, ...args: any): Promise<void>;
  updateMany?(req: Request, res: Response, ...args: any): Promise<void>;
  removeMany?(req: Request, res: Response, ...args: any): Promise<void>;
}