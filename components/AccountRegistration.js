// components/AccountRegistration.js
import React, { useState } from "react";
import { firebaseCreateUser } from "../../../utils/util"; // Adjust the import path as needed
import { useRouter } from "next/router";

const AccountRegistration = ({ onAccountCreated }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await firebaseCreateUser(email, password, router);
            onAccountCreated(); // Notify parent component that account creation was successful
        } catch (error) {
            alert("Failed to create account: " + error.message);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <label htmlFor='email'>Email address</label>
            <input
                type='email'
                name='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <label htmlFor='password'>Password</label>
            <input
                type='password'
                name='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            <button type='submit'>Create Account</button>
        </form>
    );
};

export default AccountRegistration;