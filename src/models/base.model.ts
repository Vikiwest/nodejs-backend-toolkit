import { Schema, Document, Model, model } from 'mongoose';

export interface IBaseModel extends Document {
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  isDeleted: boolean;
  softDelete(): Promise<void>;
  restore(): Promise<void>;
}

export const baseSchemaOptions = {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
};

export const baseSchema = new Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
    deletedAt: {
      type: Date,
      select: false,
    },
  },
  baseSchemaOptions
);

baseSchema.methods.softDelete = async function (this: IBaseModel): Promise<void> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
};

baseSchema.methods.restore = async function (this: IBaseModel): Promise<void> {
  this.isDeleted = false;
  this.deletedAt = undefined;
  await this.save();
};

export abstract class BaseModel<T extends IBaseModel> {
  protected model: Model<T>;

  constructor(modelName: string, schema: Schema) {
    schema.add(baseSchema);
    this.model = model<T>(modelName, schema);
  }

  async findById(id: string, includeDeleted: boolean = false): Promise<T | null> {
    const query = this.model.findById(id);
    if (!includeDeleted) {
      query.where('isDeleted').equals(false);
    }
    return await query.exec();
  }

  async findOne(filter: any, includeDeleted: boolean = false): Promise<T | null> {
    const query = this.model.findOne(filter);
    if (!includeDeleted) {
      query.where('isDeleted').equals(false);
    }
    return await query.exec();
  }

  async find(filter: any, includeDeleted: boolean = false): Promise<T[]> {
    const query = this.model.find(filter);
    if (!includeDeleted) {
      query.where('isDeleted').equals(false);
    }
    return await query.exec();
  }

  async create(data: any): Promise<T> {
    return await this.model.create(data);
  }

  async update(id: string, data: any): Promise<T | null> {
    return await this.model.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id: string, permanent: boolean = false): Promise<boolean> {
    if (permanent) {
      const result = await this.model.findByIdAndDelete(id);
      return !!result;
    } else {
      const doc = await this.findById(id);
      if (doc) {
        await doc.softDelete();
        return true;
      }
      return false;
    }
  }
}
