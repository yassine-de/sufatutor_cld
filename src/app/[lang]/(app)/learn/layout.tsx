import { SessionTracker } from "./session-tracker";

export default function LearnLayout({ children }: LayoutProps<"/[lang]/learn">) {
  return (
    <>
      <SessionTracker />
      {children}
    </>
  );
}
