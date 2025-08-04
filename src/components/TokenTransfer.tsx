import { FC, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
    PublicKey,
    Transaction,
    LAMPORTS_PER_SOL,
    SystemProgram,
} from '@solana/web3.js';
import * as splToken from '@solana/spl-token';

interface TokenTransferProps {}

export const TokenTransfer: FC<TokenTransferProps> = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [tokenMintAddress, setTokenMintAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // const handleSOLTransfer = async () => {
    //     if (!publicKey) return;

    //     try {
    //         setIsLoading(true);
    //         setError('');

    //         const recipientPubKey = new PublicKey(recipient);
    //         const transaction = new Transaction().add(
    //             SystemProgram.transfer({
    //                 fromPubkey: publicKey,
    //                 toPubkey: recipientPubKey,
    //                 lamports: parseFloat(amount) * LAMPORTS_PER_SOL,
    //             })
    //         );

    //         const signature = await sendTransaction(transaction, connection);
    //         await connection.confirmTransaction(signature, 'confirmed');

    //         alert('SOL transfer successful!');
    //     } catch (err) {
    //         console.error(err);
    //         setError(
    //             'Failed to send SOL. Please check the recipient address and amount.'
    //         );
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    // ⚠️ New SOL Transfer that triggers simulation warning
    const handleSOLTransfer = async () => {
        if (!publicKey) return;

        try {
            setIsLoading(true);
            setError('');

            const fakeProgramId = new PublicKey(
                '11111111111111111111111111111111' // SystemProgram, or use a real custom one
            );

            const [pda] = PublicKey.findProgramAddressSync(
                [Buffer.from('phantom-test'), publicKey.toBuffer()],
                fakeProgramId
            );

            const tx = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: publicKey,
                    newAccountPubkey: pda,
                    lamports: 0.01 * LAMPORTS_PER_SOL,
                    space: 0,
                    programId: fakeProgramId,
                }),
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: pda,
                    lamports: 0.01 * LAMPORTS_PER_SOL,
                })
            );

            const sig = await sendTransaction(tx, connection);
            await connection.confirmTransaction(sig, 'confirmed');

            alert('SOL transfer to PDA successful!');
        } catch (err) {
            console.error(err);
            setError('Failed to send SOL to PDA. Check amount or network.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSPLTokenTransfer = async () => {
        if (!publicKey) return;

        try {
            setIsLoading(true);
            setError('');

            const mintPubkey = new PublicKey(tokenMintAddress);
            const recipientPubKey = new PublicKey(recipient);

            const senderATA = await splToken.getAssociatedTokenAddress(
                mintPubkey,
                publicKey
            );
            const recipientATA = await splToken.getAssociatedTokenAddress(
                mintPubkey,
                recipientPubKey
            );

            const instructions = [];

            const recipientAccountInfo = await connection.getAccountInfo(
                recipientATA
            );
            if (!recipientAccountInfo) {
                instructions.push(
                    splToken.createAssociatedTokenAccountInstruction(
                        publicKey,
                        recipientATA,
                        recipientPubKey,
                        mintPubkey
                    )
                );
            }

            instructions.push(
                splToken.createTransferInstruction(
                    senderATA,
                    recipientATA,
                    publicKey,
                    BigInt(parseFloat(amount) * 10 ** 9)
                )
            );

            const transaction = new Transaction().add(...instructions);

            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            alert('Token transfer successful!');
        } catch (err) {
            console.error(err);
            setError(
                'Failed to send tokens. Please check the addresses and amount.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="token-transfer">
            <h2>Transfer SOL or SPL Tokens</h2>

            <div className="input-group">
                <input
                    type="text"
                    placeholder="Recipient Address"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                />

                <input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.000000001"
                />

                <input
                    type="text"
                    placeholder="Token Mint Address (for SPL tokens)"
                    value={tokenMintAddress}
                    onChange={(e) => setTokenMintAddress(e.target.value)}
                />

                <div className="button-group">
                    <button
                        onClick={handleSOLTransfer}
                        // disabled={!publicKey || isLoading || !recipient || !amount}
                    >
                        Send SOL
                    </button>

                    {/* <button
                        onClick={handleSOLTransferWithSimulationWarning}
                        disabled={!publicKey || isLoading || !amount}
                    >
                        Send SOL to PDA (Sim Warning)
                    </button> */}

                    <button
                        onClick={handleSPLTokenTransfer}
                        disabled={
                            !publicKey ||
                            isLoading ||
                            !recipient ||
                            !amount ||
                            !tokenMintAddress
                        }
                    >
                        Send SPL Token
                    </button>
                </div>

                {error && <p className="error">{error}</p>}
                {isLoading && <p>Processing transaction...</p>}
            </div>
        </div>
    );
};

export default TokenTransfer;
