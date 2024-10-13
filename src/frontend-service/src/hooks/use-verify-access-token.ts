import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { axiosAuthClient } from '@/lib/auth';

const authVerifyUrl: string = process.env.NEXT_PUBLIC_AUTH_VERIFY_URL || "http://127.0.0.1:5007/v1/auth/verify/";

const useVerifyAccessToken = (redirectPath?: string, errorRedirectPath?: string) => {
  const router = useRouter();

  useEffect(() => {
    console.log("called ne");
    const verifyAccessToken = async () => {
      
      try {
        const resp = await axiosAuthClient.post(authVerifyUrl, {}); // Adjust the URL as needed
        if (resp.status === 200) {
          if (redirectPath) {
            router.push(redirectPath);
          }
        } else {
            if(errorRedirectPath) {
                router.push(errorRedirectPath); // Redirect if not valid
            }
        }
      } catch (error) {
        console.error('Caught error while verifying access token:', error);
        if(errorRedirectPath) {
            router.push(errorRedirectPath); // Redirect if not valid
        }
      }
    };

    verifyAccessToken();
  }, []);
};

export default useVerifyAccessToken;