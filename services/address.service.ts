import { addressRepository } from "@/repositories/address.repository";
import { AddressInput } from "@/types";

export const addressService = {
  async getAddresses(userId: string) {
    return addressRepository.findByUser(userId);
  },

  async addAddress(userId: string, input: AddressInput) {
    return addressRepository.create(userId, input);
  },

  async updateAddress(userId: string, addressId: string, input: Partial<AddressInput>) {
    const existing = await addressRepository.findById(addressId);
    if (!existing) throw new Error("NOT_FOUND");
    if (existing.userId !== userId) throw new Error("FORBIDDEN");
    return addressRepository.update(addressId, input);
  },

  async deleteAddress(userId: string, addressId: string) {
    const existing = await addressRepository.findById(addressId);
    if (!existing) throw new Error("NOT_FOUND");
    if (existing.userId !== userId) throw new Error("FORBIDDEN");
    return addressRepository.delete(addressId);
  },
};
