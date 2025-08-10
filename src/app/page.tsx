'use client'

import {FormEvent, useEffect, useState} from "react";

function savePseudoToLocalStorage(e: React.FormEvent<HTMLFormElement>) {
    const form = e.target as HTMLFormElement;
    const pseudoInput = form.elements.namedItem('pseudo') as HTMLInputElement;
    if (pseudoInput && pseudoInput.value) {
        localStorage.setItem('pseudo', pseudoInput.value);
    }
}

export default function Home() {
    const [pseudo, setPseudo] = useState("");
    const [id, setId] = useState("");

    useEffect(() => {
        // Initialize UID in localStorage if not present
        let uid = localStorage.getItem("uid");
        if (!uid) {
            uid = crypto.randomUUID();
            localStorage.setItem("uid", uid);
        }
        setId(uid)

        const storedPseudo = localStorage.getItem("pseudo");
        if (storedPseudo) setPseudo(storedPseudo);
    }, []);

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        // Do not prevent default, let the browser handle the POST and redirect
        savePseudoToLocalStorage(event);
    }

    return (
        <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
            <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
                <div className="flex gap-4 items-center flex-col sm:flex-row">
                    <form action="/api/lobby" method="POST" onSubmit={onSubmit}>
                        <input type="hidden" name="id" value={id}/>
                        <input
                            type="text"
                            name="pseudo"
                            placeholder="Pseudo"
                            value={pseudo}
                            onChange={e => setPseudo(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.currentTarget.form?.requestSubmit();
                                }
                            }}
                        />
                        <button type="submit" className="ml-8">Create a lobby</button>
                    </form>
                </div>
            </main>
        </div>
    );
}
