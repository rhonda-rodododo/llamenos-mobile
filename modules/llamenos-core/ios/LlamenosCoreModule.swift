import ExpoModulesCore
import LlamenosCore  // UniFFI-generated Swift bindings

/// Expo Module bridging UniFFI llamenos-core Rust crypto to React Native.
///
/// All functions are synchronous (crypto operations are fast).
/// Error handling converts CryptoError to Expo exceptions.
public class LlamenosCoreModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LlamenosCore")

    // --- Key Management ---

    Function("generateKeypair") { () -> [String: Any] in
      let kp = LlamenosCore.generateKeypair()
      return keyPairToDict(kp)
    }

    Function("keypairFromNsec") { (nsec: String) -> [String: Any] in
      let kp = try LlamenosCore.keypairFromNsec(nsec: nsec)
      return keyPairToDict(kp)
    }

    Function("getPublicKey") { (secretKeyHex: String) -> String in
      return try LlamenosCore.getPublicKey(secretKeyHex: secretKeyHex)
    }

    Function("isValidNsec") { (nsec: String) -> Bool in
      return LlamenosCore.isValidNsec(nsec: nsec)
    }

    // --- ECIES Key Wrapping ---

    Function("randomBytesHex") { () -> String in
      return LlamenosCore.randomBytesHex()
    }

    Function("eciesWrapKeyHex") { (keyHex: String, recipientPubkeyHex: String, label: String) -> [String: Any] in
      let env = try LlamenosCore.eciesWrapKeyHex(keyHex: keyHex, recipientPubkeyHex: recipientPubkeyHex, label: label)
      return envelopeToDict(env)
    }

    Function("eciesUnwrapKeyHex") { (envelope: [String: Any], secretKeyHex: String, label: String) -> String in
      let env = dictToEnvelope(envelope)
      return try LlamenosCore.eciesUnwrapKeyHex(envelope: env, secretKeyHex: secretKeyHex, label: label)
    }

    // --- Note Encryption ---

    Function("encryptNoteForRecipients") { (payloadJson: String, authorPubkey: String, adminPubkeys: [String]) -> [String: Any] in
      let enc = try LlamenosCore.encryptNoteForRecipients(payloadJson: payloadJson, authorPubkey: authorPubkey, adminPubkeys: adminPubkeys)
      return [
        "encryptedContent": enc.encryptedContent,
        "authorEnvelope": envelopeToDict(enc.authorEnvelope),
        "adminEnvelopes": enc.adminEnvelopes.map { recipientEnvelopeToDict($0) },
      ]
    }

    Function("decryptNote") { (encryptedContent: String, envelope: [String: Any], secretKeyHex: String) -> String in
      let env = dictToEnvelope(envelope)
      return try LlamenosCore.decryptNote(encryptedContent: encryptedContent, envelope: env, secretKeyHex: secretKeyHex)
    }

    // --- Message Encryption ---

    Function("encryptMessageForReaders") { (plaintext: String, readerPubkeys: [String]) -> [String: Any] in
      let enc = try LlamenosCore.encryptMessageForReaders(plaintext: plaintext, readerPubkeys: readerPubkeys)
      return [
        "encryptedContent": enc.encryptedContent,
        "readerEnvelopes": enc.readerEnvelopes.map { recipientEnvelopeToDict($0) },
      ]
    }

    Function("decryptMessageForReader") { (encryptedContent: String, readerEnvelopes: [[String: Any]], secretKeyHex: String, readerPubkey: String) -> String in
      let envs = readerEnvelopes.map { dictToRecipientEnvelope($0) }
      return try LlamenosCore.decryptMessageForReader(encryptedContent: encryptedContent, readerEnvelopes: envs, secretKeyHex: secretKeyHex, readerPubkey: readerPubkey)
    }

    // --- Call Record Decryption ---

    Function("decryptCallRecordForReader") { (encryptedContent: String, adminEnvelopes: [[String: Any]], secretKeyHex: String, readerPubkey: String) -> String in
      let envs = adminEnvelopes.map { dictToRecipientEnvelope($0) }
      return try LlamenosCore.decryptCallRecordForReader(encryptedContent: encryptedContent, adminEnvelopes: envs, secretKeyHex: secretKeyHex, readerPubkey: readerPubkey)
    }

    // --- Draft Encryption ---

    Function("encryptDraft") { (plaintext: String, secretKeyHex: String) -> String in
      return try LlamenosCore.encryptDraft(plaintext: plaintext, secretKeyHex: secretKeyHex)
    }

    Function("decryptDraft") { (packedHex: String, secretKeyHex: String) -> String in
      return try LlamenosCore.decryptDraft(packedHex: packedHex, secretKeyHex: secretKeyHex)
    }

    // --- PIN Key Storage ---

    Function("encryptWithPin") { (nsec: String, pin: String, pubkeyHex: String) -> [String: Any] in
      let data = try LlamenosCore.encryptWithPin(nsec: nsec, pin: pin, pubkeyHex: pubkeyHex)
      return [
        "salt": data.salt,
        "iterations": data.iterations,
        "nonce": data.nonce,
        "ciphertext": data.ciphertext,
        "pubkey": data.pubkey,
      ]
    }

    Function("decryptWithPin") { (data: [String: Any], pin: String) -> String in
      let ekd = EncryptedKeyData(
        salt: data["salt"] as! String,
        iterations: data["iterations"] as! UInt32,
        nonce: data["nonce"] as! String,
        ciphertext: data["ciphertext"] as! String,
        pubkey: data["pubkey"] as! String
      )
      return try LlamenosCore.decryptWithPin(data: ekd, pin: pin)
    }

    Function("isValidPin") { (pin: String) -> Bool in
      return LlamenosCore.isValidPin(pin: pin)
    }

    Function("deriveKekHex") { (pin: String, saltHex: String) -> String in
      return try LlamenosCore.deriveKekHex(pin: pin, saltHex: saltHex)
    }

    // --- Auth ---

    Function("createAuthToken") { (secretKeyHex: String, timestamp: Double, method: String, path: String) -> [String: Any] in
      let token = try LlamenosCore.createAuthToken(secretKeyHex: secretKeyHex, timestamp: UInt64(timestamp), method: method, path: path)
      return [
        "pubkey": token.pubkey,
        "timestamp": token.timestamp,
        "token": token.token,
      ]
    }

    Function("verifyAuthToken") { (tokenDict: [String: Any], method: String, path: String) -> Bool in
      let token = AuthToken(
        pubkey: tokenDict["pubkey"] as! String,
        timestamp: UInt64(tokenDict["timestamp"] as! Double),
        token: tokenDict["token"] as! String
      )
      return try LlamenosCore.verifyAuthToken(token: token, method: method, path: path)
    }

    Function("verifySchnorr") { (messageHex: String, signatureHex: String, pubkeyHex: String) -> Bool in
      return try LlamenosCore.verifySchnorr(messageHex: messageHex, signatureHex: signatureHex, pubkeyHex: pubkeyHex)
    }
  }
}

// MARK: - Helpers

private func keyPairToDict(_ kp: KeyPair) -> [String: Any] {
  return [
    "secretKeyHex": kp.secretKeyHex,
    "publicKey": kp.publicKey,
    "nsec": kp.nsec,
    "npub": kp.npub,
  ]
}

private func envelopeToDict(_ env: KeyEnvelope) -> [String: Any] {
  return [
    "wrappedKey": env.wrappedKey,
    "ephemeralPubkey": env.ephemeralPubkey,
  ]
}

private func recipientEnvelopeToDict(_ env: RecipientKeyEnvelope) -> [String: Any] {
  return [
    "pubkey": env.pubkey,
    "wrappedKey": env.wrappedKey,
    "ephemeralPubkey": env.ephemeralPubkey,
  ]
}

private func dictToEnvelope(_ dict: [String: Any]) -> KeyEnvelope {
  return KeyEnvelope(
    wrappedKey: dict["wrappedKey"] as! String,
    ephemeralPubkey: dict["ephemeralPubkey"] as! String
  )
}

private func dictToRecipientEnvelope(_ dict: [String: Any]) -> RecipientKeyEnvelope {
  return RecipientKeyEnvelope(
    pubkey: dict["pubkey"] as! String,
    wrappedKey: dict["wrappedKey"] as! String,
    ephemeralPubkey: dict["ephemeralPubkey"] as! String
  )
}
