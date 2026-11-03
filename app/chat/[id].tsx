import ChatScreen from "@/components/chat/ChatScreen";
import { useLocalSearchParams } from "expo-router";

export default function ChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChatScreen conversationId={id ?? ""} />;
}
