
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { PlusCircle, LogIn, Computer, Users } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State for local game
  const [localPlayerName, setLocalPlayerName] = useState("");
  const [numBots, setNumBots] = useState(2);
  
  // State for online game
  const [onlinePlayerName, setOnlinePlayerName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");


  const handleCreateLocalGame = (e) => {
    e.preventDefault();
    if (!localPlayerName.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }
    router.push(`/local?name=${encodeURIComponent(localPlayerName)}&bots=${numBots}`);
  };

  const handleCreateOnlineRoom = (e) => {
    e.preventDefault();
    if (!onlinePlayerName.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter your name to create a room.",
        variant: "destructive",
      });
      return;
    }
    const newRoomId = `uno-${Math.random().toString(36).substr(2, 9)}`;
    router.push(`/online/${newRoomId}?name=${encodeURIComponent(onlinePlayerName)}`);
  };

  const handleJoinOnlineRoom = (e) => {
    e.preventDefault();
    if (!onlinePlayerName.trim() || !joinRoomId.trim()) {
      toast({
        title: "All fields are required",
        description: "Please enter your name and a room ID.",
        variant: "destructive",
      });
      return;
    }
    router.push(`/online/${joinRoomId}?name=${encodeURIComponent(onlinePlayerName)}`);
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold tracking-tighter text-primary">
          UnoVerse
        </h1>
        <p className="text-xl text-muted-foreground mt-2">
          The Ultimate Online Uno Experience
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
        {/* Play Online Section */}
        <Card className="transform hover:scale-105 transition-transform duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="text-primary" />
              Play Online
            </CardTitle>
            <CardDescription>
              Create or join a room to play with friends.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="online-name">Your Name</Label>
                <Input
                  id="online-name"
                  placeholder="e.g. PlayerOne"
                  value={onlinePlayerName}
                  onChange={(e) => setOnlinePlayerName(e.target.value)}
                />
            </div>

            <form onSubmit={handleCreateOnlineRoom} className="space-y-4">
               <Button type="submit" className="w-full">
                <PlusCircle className="mr-2"/> Create New Room
              </Button>
            </form>

            <div className="flex items-center space-x-2">
              <div className="flex-grow border-t border-border" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="flex-grow border-t border-border" />
            </div>

            <form onSubmit={handleJoinOnlineRoom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-id">Room ID</Label>
                <Input
                  id="room-id"
                  placeholder="Enter Room ID to join"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <LogIn className="mr-2"/> Join Game
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Play vs Computer Section */}
        <Card className="transform hover:scale-105 transition-transform duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Computer className="text-accent-foreground" />
              Play vs. Computer
            </CardTitle>
            <CardDescription>
              Challenge our AI bots to a classic game of Uno.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateLocalGame} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="local-name">Your Name</Label>
                <Input
                  id="local-name"
                  placeholder="e.g. SoloPlayer"
                  value={localPlayerName}
                  onChange={(e) => setLocalPlayerName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-4">
                <Label htmlFor="num-bots">Number of Bots ({numBots})</Label>
                 <Slider
                    id="num-bots"
                    min={1}
                    max={5}
                    step={1}
                    value={[numBots]}
                    onValueChange={(value) => setNumBots(value[0])}
                />
              </div>
              <Button type="submit" className="w-full">
                Start Local Game
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
