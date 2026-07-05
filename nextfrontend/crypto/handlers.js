import {generateMAC, generateSymmetricKey, generateHMACKey, encryptData, verifyMAC, decryptData, importKey, encryptAndSignKey, importHmacKey} from '@/crypto/symKeyUtils';
import {base64ToArrayBuffer, generateRSAKeyPair, decryptWithPrivateKey, verifySignatureWithPublicKey, importPrivateKey, importPublicKey} from '@/crypto/rsaUtils';
import { sign } from 'crypto';

export const handleRegistration = async(user_data) => {
    try {
        const key_pair = await generateRSAKeyPair();
        let public_key = key_pair.public_key;
        let private_key = key_pair.private_key;

        localStorage.setItem(user_data.username + '_' + 'public_key', public_key);
        localStorage.setItem(user_data.username + '_' + 'private_key', private_key);

    
        if (!public_key || !private_key)
            throw new Error("Failed to generate RSA keys.");
  

        const symmetric_key = await generateSymmetricKey();
        const symmetric_key_videos = await generateSymmetricKey(); // videos

        const hmac_key = await generateHMACKey();
        const hmac_key_videos = await generateHMACKey(); // videos

        const hmac_username = await generateMAC(user_data.username, hmac_key);

        const encrypted_email = JSON.stringify(await encryptData(user_data.email, symmetric_key));
        const hmac_email = await generateMAC(encrypted_email, hmac_key);

        const imported_public_key = await importPublicKey(public_key, 'encrypt'); // no need to do this again for videos
        const imported_private_key = await importPrivateKey(private_key, 'sign');

        const encrypted_signature_symmetric_key = await encryptAndSignKey(symmetric_key, imported_public_key, imported_private_key);
        const encrypted_signature_hmac_key = await encryptAndSignKey(hmac_key, imported_public_key, imported_private_key);
        
        const encrypted_signature_symmetric_key_videos = await encryptAndSignKey(symmetric_key_videos, imported_public_key, imported_private_key);
        const encrypted_signature_hmac_key_videos = await encryptAndSignKey(hmac_key_videos, imported_public_key, imported_private_key);

        var data = {
            username: user_data.username,
            hmac_username,
            email: encrypted_email,
            hmac_email,
            encrypted_symmetric_key: encrypted_signature_symmetric_key.key,
            encrypted_symmetric_key_videos: encrypted_signature_symmetric_key_videos.key,
            signature_symmetric_key: encrypted_signature_symmetric_key.signature,
            signature_symmetric_key_videos: encrypted_signature_symmetric_key_videos.signature,
            encrypted_hmac_key: encrypted_signature_hmac_key.key,
            signature_hmac_key: encrypted_signature_hmac_key.signature,
            encrypted_hmac_key_videos: encrypted_signature_hmac_key_videos.key,
            signature_hmac_key_videos: encrypted_signature_hmac_key_videos.signature,
            public_key,
            
        };
        if(! user_data.organization) {
            return data;
        }
        const encrypted_fullname = JSON.stringify(await encryptData(user_data.fullName, symmetric_key));
        const hmac_fullname = await generateMAC(encrypted_fullname, hmac_key);

        const encrypted_organization = JSON.stringify(await encryptData(user_data.organization, symmetric_key));
        const hmac_organization = await generateMAC(encrypted_organization, hmac_key);

        const encrypted_country = JSON.stringify(await encryptData(user_data.country, symmetric_key));
        const hmac_country = await generateMAC(encrypted_country, hmac_key);
        
        data["fullname"] = encrypted_fullname;
        data["hmac_fullname"] = hmac_fullname;
        data["organization"] = encrypted_organization;
        data["hmac_organization"] = hmac_organization;
        data["country"] = encrypted_country;
        data["hmac_country"] = hmac_country;
        return data;
    } catch (error) {
        throw Error('Error during sign-up.');
    }
}

export const handleLogin = async(token) => {
    try {
        // TODO: encrypt the keys before storage
    } catch (error) {
        throw Error('Error during login.');
    }
}


export const handleProfileTrusted = async(user_data) => {
    try {
        const {
            username,
            hmac_username,
            email: encrypted_email,
            hmac_email,
            fullname: encrypted_fullname,
            hmac_fullname,
            country: encrypted_country,
            hmac_country,
            organization: encrypted_organization,
            hmac_organization,
            encrypted_symmetric_key,
            signature_symmetric_key,
            encrypted_symmetric_key_videos,
            signature_symmetric_key_videos,
            encrypted_hmac_key,
            signature_hmac_key,
            encypted_hmac_key_videos,
            signature_hmac_key_videos,

        } = user_data;

        // Retrieve and validate public key
        const public_key = localStorage.getItem(user_data.username + '_' + 'public_key');
        if (!public_key) throw new Error('Public key not found.');

        const private_key = localStorage.getItem(user_data.username + '_' + 'private_key');
        if (!private_key) throw new Error('Private key not found.');

        const imported_public_key = await importPublicKey(public_key, 'verify');
        const imported_private_key = await importPrivateKey(private_key, 'decrypt');

        // Verify the keys
        const is_symmetric_key_valid = await verifySignatureWithPublicKey(encrypted_symmetric_key, signature_symmetric_key, imported_public_key);
        const is_hmac_key_valid = await verifySignatureWithPublicKey(encrypted_hmac_key, signature_hmac_key, imported_public_key);
        if (!is_symmetric_key_valid || !is_hmac_key_valid) {
            // TODO delete user with false data
            //await deleteUser(username);
            throw new Error('Invalid user: The user\'s keys has been modified or is invalid.');
        }

        // Decrypt symmetric key
        const symmetric_key_base64 = await decryptWithPrivateKey(encrypted_symmetric_key, imported_private_key);
        const symmetric_key = await importKey(base64ToArrayBuffer(symmetric_key_base64));
        // Decrypt HMAC key
        const hmac_key_base64 = await decryptWithPrivateKey(encrypted_hmac_key, imported_private_key);
        const hmac_key = await importHmacKey(base64ToArrayBuffer(hmac_key_base64));

        // Verify the HMAC
        const is_username_valid = await verifyMAC(username, hmac_username, hmac_key);
        const is_fullname_valid = await verifyMAC(encrypted_fullname, hmac_fullname, hmac_key);
        const is_email_valid = await verifyMAC(encrypted_email, hmac_email, hmac_key);
        const is_organization_valid = await verifyMAC(encrypted_organization, hmac_organization, hmac_key);
        const is_country_valid = await verifyMAC(encrypted_country, hmac_country, hmac_key);
        if (!is_username_valid || !is_fullname_valid || !is_email_valid || !is_organization_valid || !is_country_valid) {
            //await deleteUser(username);
            throw new Error('Invalid user: The user\'s data has been modified or is invalid.');
        }

        // Decrypt and verify user data
        const enc_email = JSON.parse(encrypted_email);
        const decrypted_email = await decryptData(enc_email, symmetric_key);        

        // Decrypt and verify user data
        const enc_fullname = JSON.parse(encrypted_fullname);
        const decrypted_fullname = await decryptData(enc_fullname, symmetric_key);

        const enc_organization = JSON.parse(encrypted_organization);
        const decrypted_organization = await decryptData(enc_organization, symmetric_key);

        const enc_country = JSON.parse(encrypted_country);
        const decrypted_country = await decryptData(enc_country, symmetric_key);
        return {
            username,
            email: decrypted_email,
            fullname: decrypted_fullname,
            organization: decrypted_organization,
            country: decrypted_country
        };

    } catch (error) {
        throw Error('Unable to decrypt data.');
    }
};


export const handleProfile = async(user_data) => {
    try {
        const {
            username,
            hmac_username,
            email: encrypted_email,
            hmac_email,
            encrypted_symmetric_key,
            signature_symmetric_key,
            encrypted_symmetric_key_videos,
            encrypted_signature_symmetric_key,
            encrypted_hmac_key,
            signature_hmac_key,
            encypted_hmac_key_videos,
            signature_hmac_key_videos,
        } = user_data;

        // Retrieve and validate public key
        const public_key = localStorage.getItem(user_data.username + '_' + 'public_key');
        if (!public_key) throw new Error('Public key not found.');

        const private_key = localStorage.getItem(user_data.username + '_' + 'private_key');
        if (!private_key) throw new Error('Private key not found.');

        const imported_public_key = await importPublicKey(public_key, 'verify');
        const imported_private_key = await importPrivateKey(private_key, 'decrypt');

        // Verify the keys
        const is_symmetric_key_valid = await verifySignatureWithPublicKey(encrypted_symmetric_key, signature_symmetric_key, imported_public_key);
        const is_hmac_key_valid = await verifySignatureWithPublicKey(encrypted_hmac_key, signature_hmac_key, imported_public_key);
        if (!is_symmetric_key_valid || !is_hmac_key_valid) {
            // TODO delete user with false data
            //await deleteUser(username);
            throw new Error('Invalid user: The user\'s keys has been modified or is invalid.');
        }

        // Decrypt symmetric key
        const symmetric_key_base64 = await decryptWithPrivateKey(encrypted_symmetric_key, imported_private_key);
        const symmetric_key = await importKey(base64ToArrayBuffer(symmetric_key_base64));
        // Decrypt HMAC key
        const hmac_key_base64 = await decryptWithPrivateKey(encrypted_hmac_key, imported_private_key);
        const hmac_key = await importHmacKey(base64ToArrayBuffer(hmac_key_base64));

        // Verify the HMAC
        const is_username_valid = await verifyMAC(username, hmac_username, hmac_key);
        const is_email_valid = await verifyMAC(encrypted_email, hmac_email, hmac_key);
        if (!is_username_valid || !is_email_valid) {
            //await deleteUser(username);
            throw new Error('Invalid user: The user\'s data has been modified or is invalid.');
        }

        // Decrypt and verify user data
        const enc_email = JSON.parse(encrypted_email);
        const decrypted_email = await decryptData(enc_email, symmetric_key);
        return {
            username,
            email: decrypted_email
        };

    } catch (error) {
        throw Error('Unable to decrypt data.');
    }
};


export const handleVideo = async (video_data) => {
    try {
        const {
            username,
            videos, // Array contenant les chemins des vidéos
            encrypted_symmetric_key_videos,
            signature_symmetric_key_videos,
            encypted_hmac_key_videos,
            signature_hmac_key_videos,
        } = video_data;

        // Récupération des clés publiques et privées
        const public_key = localStorage.getItem(username + '_public_key');
        if (!public_key) throw new Error('Clé publique introuvable.');

        const private_key = localStorage.getItem(username + '_private_key');
        if (!private_key) throw new Error('Clé privée introuvable.');

        const imported_public_key = await importPublicKey(public_key, 'verify');
        const imported_private_key = await importPrivateKey(private_key, 'decrypt');

        // Vérification des signatures numériques
        const is_symmetric_key_valid = await verifySignatureWithPublicKey(
            encrypted_symmetric_key_videos,
            signature_symmetric_key_videos,
            imported_public_key
        );

        /* const is_hmac_key_valid = await verifySignatureWithPublicKey(
            encypted_hmac_key_videos,
            signature_hmac_key_videos,
            imported_public_key
        ); */

        if (!is_symmetric_key_valid) {
            throw new Error('Clés de vidéos invalides ou altérées.');
        }

        // Décryptage des clés symétriques et HMAC
        const symmetric_key_base64 = await decryptWithPrivateKey(encrypted_symmetric_key_videos, imported_private_key);
        const symmetric_key = await importKey(base64ToArrayBuffer(symmetric_key_base64));

        const hmac_key_base64 = await decryptWithPrivateKey(encypted_hmac_key_videos, imported_private_key);
        const hmac_key = await importHmacKey(base64ToArrayBuffer(hmac_key_base64));

        // Vérification des HMAC pour les vidéos
        const verified_videos = [];
        for (const video of videos) {
            const hmac_video = localStorage.getItem(username + '_hmac_video_' + video); // Récupérer le HMAC associé
            const is_video_valid = await verifyMAC(video, hmac_video, hmac_key);

            if (!is_video_valid) {
                throw new Error(`Données vidéo invalides ou altérées : ${video}`);
            }

            // Déchiffrer si besoin (si vidéos stockées chiffrées)
            const decrypted_video = await decryptData(video, symmetric_key);
            verified_videos.push(decrypted_video);
        }

        return {
            username,
            videos: verified_videos,
        };
    } catch (error) {
        console.error('Erreur dans handleVideo:', error.message);
        throw new Error('Impossible de traiter les informations des vidéos.');
    }
};


  