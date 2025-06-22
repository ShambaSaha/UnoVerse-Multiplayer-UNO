
"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, Play, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { createOnlineGameFromPlayers } from "@/lib/mock-data";
import { GameBoard } from "@/components/game-board";

function GameRoom() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const roomId = params.id;
    const name = searchParams.get("name") || "Guest";

    const [game, setGame] = useState(null);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [loading, setLoading] = useState(true);

    const roomUrl = typeof window !== 'undefined' ? `${window.location.origin}/online/${roomId}` : '';

    useEffect(() => {
        const playerId = sessionStorage.getItem(`uno-player-id-${roomId}`) || `player_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem(`uno-player-id-${roomId}`, playerId);
        setCurrentPlayer({ id: playerId, name, isHost: false, cards: [] });
    }, [name, roomId]);

    useEffect(() => {
        if (!currentPlayer || !roomId) return;

        const gameRef = doc(db, "games", roomId);

        const joinGame = async () => {
            try {
                const docSnap = await getDoc(gameRef);
                if (docSnap.exists()) {
                    const gameData = docSnap.data();
                    if (!gameData.players.find(p => p.id === currentPlayer.id) && gameData.players.length < 6) {
                         await updateDoc(gameRef, {
                            players: arrayUnion(currentPlayer)
                        });
                    } else if (gameData.players.length >= 6) {
                        toast({ title: "Room Full", description: "This game room is already full.", variant: "destructive" });
                    }
                } else {
                    const newGame = {
                        id: roomId,
                        players: [{ ...currentPlayer, isHost: true }],
                        status: 'waiting',
                    };
                    await setDoc(gameRef, newGame);
                }
            } catch (error) {
                console.error("Error joining game: ", error);
                toast({ title: "Connection Error", description: "Could not connect to the game room. Check your Firebase setup.", variant: "destructive" });
            }
        };
        
        joinGame();

        const unsubscribe = onSnapshot(gameRef, (doc) => {
            if (doc.exists()) {
                setGame(doc.data());
            } else {
                setGame(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Snapshot error: ", error);
            toast({ title: "Connection Error", description: "Lost connection to the game room.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomId, currentPlayer, toast]);


    const copyLink = () => {
        navigator.clipboard.writeText(roomUrl);
        toast({
            title: "Link Copied!",
            description: "The room link has been copied to your clipboard.",
        });
    };

    const handleStartGame = async () => {
        if(game.players.length < 2) {
             toast({
                title: "Not enough players",
                description: "You need at least 2 players to start.",
                variant: "destructive",
            });
            return;
        }
        const startedGameState = createOnlineGameFromPlayers(game.players);
        const gameRef = doc(db, "games", roomId);
        await updateDoc(gameRef, {
            ...startedGameState,
            status: 'playing',
            id: roomId,
        });
    };

    const amIHost = game?.players.find(p => p.id === currentPlayer?.id)?.isHost;

    if (loading || !game) {
        return <LoadingFallback />;
    }

    if (game.status === 'playing') {
        return <GameBoard initialGameState={game} playerId={currentPlayer?.id} isOnline={true} />;
    }

    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-primary/20">
            <div className="text-center mb-8">
                <h1 className="text-5xl font-bold tracking-tighter text-primary">
                UnoVerse Room
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                Get ready to play!
                </p>
            </div>
            <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <Users /> Waiting for Players...
                        </div>
                        <span className="text-sm font-normal bg-primary/20 text-primary-foreground rounded-full px-3 py-1">{game.players.length} / 6</span>
                    </CardTitle>
                    <CardDescription>
                        You are in room <span className="font-mono bg-muted px-2 py-1 rounded">{roomId}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2">Invite your friends</h3>
                         <div className="flex items-center gap-2">
                            <Input type="text" value={roomUrl} readOnly className="bg-input" />
                            <Button onClick={copyLink} size="icon" variant="outline">
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                
                    <div className="space-y-2">
                        <h3 className="font-semibold">Players Joined:</h3>
                        <ul className="space-y-2">
                            {game.players.map(p => (
                                <li key={p.id} className="flex items-center justify-between bg-muted p-2 rounded-md">
                                    <span>{p.name}</span>
                                    {p.isHost && <span className="text-xs font-bold text-primary">HOST</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    {amIHost ? (
                        <Button 
                            onClick={handleStartGame} 
                            className="w-full text-lg"
                            size="lg"
                            disabled={game.players.length < 2}
                        >
                            <Play className="mr-2"/>
                            Start Game
                        </Button>
                    ) : (
                        <div className="text-center text-muted-foreground p-4 bg-muted rounded-lg flex items-center justify-center gap-2">
                            <Loader2 className="animate-spin" />
                            Waiting for the host to start the game...
                         </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}

function LoadingFallback() {
    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-primary/20">
            <div className="text-center mb-8">
                 <Skeleton className="w-72 h-12 mb-2" />
                 <Skeleton className="w-48 h-6" />
            </div>
            <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader>
                    <Skeleton className="w-48 h-8" />
                    <Skeleton className="w-full h-5 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="space-y-2">
                        <Skeleton className="w-32 h-5" />
                         <div className="flex items-center gap-2">
                           <Skeleton className="w-full h-10" />
                           <Skeleton className="w-10 h-10" />
                        </div>
                    </div>
                     <Skeleton className="w-full h-20" />
                     <Skeleton className="w-full h-12" />
                </CardContent>
            </Card>
        </main>
    )
}

export default function OnlineGameRoomPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GameRoom />
    </Suspense>
  );
}
