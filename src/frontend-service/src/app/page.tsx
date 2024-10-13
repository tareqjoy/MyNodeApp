import { redirect, RedirectType } from "next/navigation";

const HomePage = () => {
  redirect('/login', RedirectType.replace);
};

export default HomePage;