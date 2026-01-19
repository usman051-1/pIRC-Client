import { useState } from "react";
import { RetroWindow, RetroInput, RetroButton } from "./RetroUI";
import { Terminal } from "lucide-react";

interface ConnectModalProps {
  onConnect: (username: string) => void;
  isOpen: boolean;
}

export function ConnectModal({ onConnect, isOpen }: ConnectModalProps) {
  const [username, setUsername] = useState("");
  const [server] = useState("irc.pirc.net (Default)");
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <RetroWindow 
        title="mIRC Options" 
        icon={<Terminal className="w-3 h-3" />}
        className="w-[400px]"
        isActive={true}
      >
        <div className="flex gap-4 p-2 h-full">
          {/* Sidebar */}
          <div className="w-1/4 bevel-down bg-white p-2">
            <ul className="text-xs space-y-1">
              <li className="font-bold text-black bg-gray-200 px-1">Connect</li>
              <li className="pl-2 text-gray-600">Servers</li>
              <li className="pl-2 text-gray-600">Options</li>
              <li className="pl-2 text-gray-600">Local Info</li>
            </ul>
          </div>

          {/* Form */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs">Full Name:</label>
                <RetroInput disabled value="Guest User" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs">Email Address:</label>
                <RetroInput disabled value="guest@pirc.net" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold">Nickname:</label>
                <RetroInput 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter Nickname..." 
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && username && onConnect(username)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs">Alternative:</label>
                <RetroInput disabled value="Guest_?" />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-auto pt-4 border-t border-gray-400">
              <RetroButton 
                onClick={() => username && onConnect(username)}
                disabled={!username}
                className="px-6 font-bold"
              >
                Connect
              </RetroButton>
              <RetroButton onClick={() => {}}>
                Cancel
              </RetroButton>
            </div>
          </div>
        </div>
      </RetroWindow>
    </div>
  );
}
