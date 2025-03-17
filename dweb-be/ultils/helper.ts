import { verifyMessage } from 'viem';

export const verifySignature = async (
  address: string,
  message: string,
  signature: string,
) => {
  try {
    return verifyMessage({
      address: address as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    });
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
};
