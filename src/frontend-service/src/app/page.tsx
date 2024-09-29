'use client'

import { useRouter } from "next/navigation";

const HomePage = () => {
  const router = useRouter();

  router.push("/login")
  return ("");
};

export default HomePage;