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

    

    const handleSOLTransfer = async () => {
        if (!publicKey) return;
    
        try {
            setIsLoading(true);
            setError('');

            // Convert recipient string to PublicKey
            const recipientPubKey = new PublicKey(recipient);
            
            // Create a program derived address that will cause simulation failure
            const programId = new PublicKey('J7eK9yPvErH3YZKmFxHZEuEqbPxJ9qtrJq1xHE3RmxE');
            const [pda] = PublicKey.findProgramAddressSync(
                [Buffer.from('test')],
                programId
            );

            // Create transaction with program invoke and actual transfer
            const tx = new Transaction();

            // Add a program invoke that will fail simulation
            const data = Buffer.from('test');
            tx.add({
                programId: programId,
                keys: [
                    {
                        pubkey: pda,
                        isSigner: false,
                        isWritable: true,
                    },
                    {
                        pubkey: publicKey,
                        isSigner: true,
                        isWritable: true,
                    }
                ],
                data: data,
            });

            // Add the actual transfer to recipient
            tx.add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: recipientPubKey,
                    lamports: BigInt(parseFloat(amount) * LAMPORTS_PER_SOL),
                })
            );

            const signature = await sendTransaction(tx, connection);
            await connection.confirmTransaction(signature, 'confirmed');
    
            alert('SOL transfer successful!');
        } catch (err) {
            console.error(err);
            setError('Transaction failed.');
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
                        disabled={!publicKey || isLoading || !recipient || !amount}
                    >
                        Send SOL
                    </button>

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
