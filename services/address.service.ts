import { Prisma } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
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

    // H-05: block deletion when referenced by an ACTIVE subscription
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        addressId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (activeSubscription) {
      throw new Error("ADDRESS_IN_USE_SUBSCRIPTION");
    }

    try {
      return await addressRepository.delete(addressId);
    } catch (err: unknown) {
      // H-06: FK Restrict on Order.address → friendly 409
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        throw new Error("ADDRESS_IN_USE_ORDER");
      }
      throw err;
    }
  },
};
