import { axiosAuthClient } from '@/lib/auth';

const authVerifyUrl: string = process.env.NEXT_PUBLIC_AUTH_VERIFY_URL || "http://localhost:80/v1/auth/verify/";

export default async function useVerifyAccessToken(): Promise<boolean> {
  console.log("useVerifyAccessToken: is called");
  try {
    const resp = await axiosAuthClient.post(authVerifyUrl, {}); 
    if (resp.status === 200) {
      console.log(`useVerifyAccessToken: returned 200 from: ${authVerifyUrl}`);
      return true;
    } else {
      console.log(`useVerifyAccessToken: returned ${resp.status} from: ${authVerifyUrl}`);
      return false;
    }
  } catch (error) {
    console.error('useVerifyAccessToken: Caught error while verifying access token');
    return false;
  }
};