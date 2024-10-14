import { axiosAuthClient } from '@/lib/auth';

const authVerifyUrl: string = process.env.NEXT_PUBLIC_AUTH_VERIFY_URL || "http://127.0.0.1:5007/v1/auth/verify/";

export default async function useVerifyAccessToken(): Promise<string | null> {
  console.log("called ne");
    try {
      const resp = await axiosAuthClient.post(authVerifyUrl, {}); 
      if (resp.status === 200) {
        return resp.data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Caught error while verifying access token:', error);
      return null;
    }
};