import { useState, useEffect, useRef } from "react";
import { RetroWindow, RetroButton, RetroInput, RetroDisplay } from "@/components/RetroUI";
import { ConnectModal } from "@/components/ConnectModal";
import { useIRCWebSocket, useChannels, useChannelMessages, useUsers, useCreateChannel } from "@/hooks/use-irc";
import { WsMessage, WS_EVENTS } from "@shared/schema";
import { format } from "date-fns";
import { Hash, User, Zap, Settings, HelpCircle, Monitor, XCircle, FolderOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
interface Tab {
  id: string;
  type: 'status' | 'channel';
  name: string;
  unread?: boolean;
}

interface LogMessage {
  timestamp: Date;
  content: string;
  type: 'system' | 'msg' | 'action' | 'join' | 'part' | 'error' | 'own';
  sender?: string;
}

// --- Main Page Component ---
export default function Home() {
  const [username, setUsername] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>("status");
  const [tabs, setTabs] = useState<Tab[]>([{ id: "status", type: 'status', name: "Status" }]);
  const [inputVal, setInputVal] = useState("");
  
  // Local log state for the "Status" window and channel buffers
  // In a real app, this would be more sophisticated (e.g. Redux or dedicated context)
  const [logs, setLogs] = useState<Record<string, LogMessage[]>>({
    status: [{ timestamp: new Date(), content: "Welcome to pIRC v1.0", type: "system" }]
  });

  // Hookups
  const { status: wsStatus, sendMessage, joinChannel, partChannel } = useIRCWebSocket(username ? { username } : null);
  const { data: channelsList } = useChannels();
  const { data: remoteMessages } = useChannelMessages(activeTabId !== "status" ? activeTabId : "");
  const { data: onlineUsers } = useUsers();
  const createChannel = useCreateChannel();

  // Refs for scrolling
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, activeTabId, remoteMessages]);

  // Handle incoming global events (like joins/parts showing in status)
  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<WsMessage>;
      const msg = customEvent.detail;
      
      const timestamp = new Date();
      let logType: LogMessage['type'] = 'msg';
      let content = msg.content || "";
      
      if (msg.type === WS_EVENTS.JOIN) {
        logType = 'join';
        content = `has joined ${msg.channel}`;
      } else if (msg.type === WS_EVENTS.PART) {
        logType = 'part';
        content = `has left ${msg.channel}`;
      } else if (msg.type === WS_EVENTS.ERROR) {
        logType = 'error';
      }

      const entry: LogMessage = {
        timestamp,
        content,
        type: logType,
        sender: msg.user
      };

      // Add to relevant buffer
      const target = msg.channel || 'status';
      
      setLogs(prev => ({
        ...prev,
        [target]: [...(prev[target] || []), entry]
      }));
    };

    window.addEventListener('irc-message', handleEvent);
    return () => window.removeEventListener('irc-message', handleEvent);
  }, []);

  // Sync historical messages when switching to a channel tab
  useEffect(() => {
    if (activeTabId !== "status" && remoteMessages) {
      const historyLogs: LogMessage[] = remoteMessages.map(m => ({
        timestamp: new Date(m.createdAt || Date.now()),
        content: m.content,
        sender: m.userId || undefined,
        type: m.userId === username ? 'own' : 'msg'
      }));
      
      setLogs(prev => ({
        ...prev,
        [activeTabId]: historyLogs // Simple replace for MVP, ideally merge
      }));
    }
  }, [remoteMessages, activeTabId, username]);

  // --- Handlers ---

  const handleConnect = (nick: string) => {
    setUsername(nick);
    setLogs(prev => ({
      ...prev,
      status: [...prev.status, { timestamp: new Date(), content: `Connecting as ${nick}...`, type: "system" }]
    }));
  };

  const handleCommand = (cmd: string) => {
    if (!cmd.trim()) return;

    if (cmd.startsWith("/")) {
      const parts = cmd.split(" ");
      const command = parts[0].toLowerCase();
      const arg = parts[1];

      switch(command) {
        case "/join":
          if (arg) {
            // Check if tab exists
            if (!tabs.find(t => t.name === arg)) {
              setTabs([...tabs, { id: arg, type: 'channel', name: arg }]);
              setLogs(prev => ({ ...prev, [arg]: [] }));
            }
            joinChannel(arg);
            // Also ensure it exists on backend
            createChannel.mutate({ name: arg, topic: "New Channel" });
            setActiveTabId(arg);
          }
          break;
        case "/part":
          const target = arg || (activeTabId !== "status" ? activeTabId : null);
          if (target) {
            partChannel(target);
            setTabs(prev => prev.filter(t => t.id !== target));
            setActiveTabId("status");
          }
          break;
        case "/clear":
          setLogs(prev => ({ ...prev, [activeTabId]: [] }));
          break;
        default:
          setLogs(prev => ({
            ...prev,
            [activeTabId]: [...(prev[activeTabId] || []), { timestamp: new Date(), content: "Unknown command", type: "error" }]
          }));
      }
    } else {
      // Normal message
      if (activeTabId === "status") {
        setLogs(prev => ({
          ...prev,
          status: [...prev.status, { timestamp: new Date(), content: "Cannot send text to status window", type: "error" }]
        }));
      } else {
        sendMessage(cmd, activeTabId);
        // Optimistic update
        setLogs(prev => ({
          ...prev,
          [activeTabId]: [...(prev[activeTabId] || []), { 
            timestamp: new Date(), 
            content: cmd, 
            type: "own",
            sender: username || "Me"
          }]
        }));
      }
    }
    setInputVal("");
  };

  // --- Render Helpers ---

  const renderLogMessage = (msg: LogMessage, idx: number) => {
    const time = format(msg.timestamp, "HH:mm");
    
    switch(msg.type) {
      case "join":
        return <div key={idx} className="text-[#009300]">* {msg.sender} ({msg.content})</div>;
      case "part":
        return <div key={idx} className="text-[#009300]">* {msg.sender} {msg.content}</div>;
      case "error":
        return <div key={idx} className="text-red-500">* [Error] {msg.content}</div>;
      case "system":
        return <div key={idx} className="text-[#00007f]">* {msg.content}</div>;
      case "own":
        return (
          <div key={idx}>
            <span className="text-gray-400">[{time}]</span> <span className="text-[#0000ff]">&lt;{msg.sender}&gt;</span> {msg.content}
          </div>
        );
      default:
        return (
          <div key={idx}>
            <span className="text-gray-400">[{time}]</span> <span className="text-white">&lt;{msg.sender}&gt;</span> {msg.content}
          </div>
        );
    }
  };

  const activeMessages = logs[activeTabId] || [];
  const currentChannelUsers = onlineUsers || []; // In a real app, filter by channel

  return (
    <div className="h-screen w-screen flex flex-col font-sans">
      <ConnectModal isOpen={!username} onConnect={handleConnect} />

      {/* 1. Menu Bar */}
      <div className="bg-[#c0c0c0] flex items-center px-1 py-0.5 border-b border-white shadow-sm select-none">
         {['File', 'View', 'Favorites', 'Tools', 'Commands', 'Window', 'Help'].map(menu => (
           <div key={menu} className="px-2 py-0.5 hover:bg-[#000080] hover:text-white cursor-pointer text-sm">
             <span className="underline">{menu.charAt(0)}</span>{menu.slice(1)}
           </div>
         ))}
      </div>

      {/* 2. Toolbar */}
      <div className="bg-[#c0c0c0] p-1 flex gap-1 border-b border-gray-400 bevel-up mb-1">
         <RetroButton title="Connect" onClick={() => !username && setUsername(null)}><Zap className="w-4 h-4 text-yellow-600 fill-current" /></RetroButton>
         <RetroButton title="Disconnect" onClick={() => setUsername(null)}><XCircle className="w-4 h-4 text-red-600" /></RetroButton>
         <div className="w-px h-full bg-gray-400 mx-1 border-r border-white" />
         <RetroButton title="Channels List"><FolderOpen className="w-4 h-4 text-yellow-500 fill-current" /></RetroButton>
         <RetroButton title="Scripts"><FileText className="w-4 h-4 text-white fill-current" /></RetroButton>
         <div className="w-px h-full bg-gray-400 mx-1 border-r border-white" />
         <RetroButton title="Options"><Settings className="w-4 h-4 text-gray-600" /></RetroButton>
         <RetroButton title="About"><HelpCircle className="w-4 h-4 text-blue-600" /></RetroButton>
      </div>

      {/* 3. Main Workspace */}
      <div className="flex-1 bg-[#808080] p-1 flex relative overflow-hidden">
        {/* We simulate MDI (Multiple Document Interface) by just having one maximized window for now */}
        
        <RetroWindow 
          title={`pIRC - [${activeTabId === 'status' ? 'Status: ' + (username || 'Not connected') : activeTabId}]`}
          icon={activeTabId === 'status' ? <Monitor className="w-3 h-3 text-white" /> : <Hash className="w-3 h-3 text-white" />}
          className="w-full h-full"
          onClose={() => activeTabId !== 'status' && handleCommand("/part")}
        >
          {/* Internal Toolbar / Tab Switcher (Simulating window tabs) */}
          <div className="flex bg-[#c0c0c0] border-b border-gray-400 pb-1 gap-1">
             {tabs.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTabId(tab.id)}
                 className={cn(
                   "px-3 py-0.5 text-xs font-bold border border-gray-600",
                   activeTabId === tab.id 
                     ? "bg-white border-t-black border-l-black border-r-gray-200 border-b-gray-200" // pressed look roughly
                     : "bevel-up"
                 )}
               >
                 {tab.name}
               </button>
             ))}
          </div>

          <div className="flex-1 flex min-h-0 gap-1 mt-1">
            {/* Left: Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
               <RetroDisplay className="flex-1">
                 <div className="font-mono text-[13px] whitespace-pre-wrap break-words">
                   {/* Header info */}
                   <div className="text-center text-gray-500 py-2">
                     {activeTabId === 'status' ? '--- Server Status ---' : `--- Now talking in ${activeTabId} ---`}
                   </div>
                   
                   {activeMessages.map((msg, i) => renderLogMessage(msg, i))}
                   <div ref={chatEndRef} />
                 </div>
               </RetroDisplay>
            </div>

            {/* Right: User List (Only for channels) */}
            {activeTabId !== 'status' && (
              <div className="w-48 flex flex-col bevel-down bg-white min-h-0">
                 <div className="bg-[#c0c0c0] px-1 text-xs border-b border-gray-400">{currentChannelUsers.length} Users</div>
                 <div className="overflow-y-auto p-1 font-sans text-sm">
                    {currentChannelUsers.map((u) => (
                      <div key={u.username} className="flex items-center gap-1 cursor-pointer hover:bg-blue-600 hover:text-white px-1">
                         {u.username === username ? <span className="text-red-500 text-[10px] w-3">@</span> : <span className="w-3"/>}
                         <span>{u.username}</span>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>
          
          {/* Bottom: Input Line */}
          <div className="mt-1 flex gap-1 items-center">
             <div className="font-bold text-xs min-w-[60px] truncate text-right pr-2">
               [{username || "Guest"}]
             </div>
             <RetroInput 
               className="flex-1 h-7 font-mono"
               value={inputVal}
               onChange={(e) => setInputVal(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleCommand(inputVal)}
               autoFocus
               placeholder={wsStatus !== 'connected' ? "Connecting..." : `Talk in ${activeTabId}...`}
               disabled={wsStatus !== 'connected'}
             />
          </div>

        </RetroWindow>
      </div>
    </div>
  );
}
