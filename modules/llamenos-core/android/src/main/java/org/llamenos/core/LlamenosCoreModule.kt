package org.llamenos.core

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo Module bridging UniFFI llamenos-core Rust crypto to React Native.
 *
 * All functions are synchronous (crypto operations are fast).
 * The UniFFI-generated Kotlin bindings live in `org.llamenos.core.llamenos_core`.
 */
class LlamenosCoreModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LlamenosCore")

    // --- Key Management ---

    Function("generateKeypair") {
      val kp = org.llamenos.core.generateKeypair()
      mapOf(
        "secretKeyHex" to kp.secretKeyHex,
        "publicKey" to kp.publicKey,
        "nsec" to kp.nsec,
        "npub" to kp.npub,
      )
    }

    Function("keypairFromNsec") { nsec: String ->
      val kp = org.llamenos.core.keypairFromNsec(nsec)
      mapOf(
        "secretKeyHex" to kp.secretKeyHex,
        "publicKey" to kp.publicKey,
        "nsec" to kp.nsec,
        "npub" to kp.npub,
      )
    }

    Function("getPublicKey") { secretKeyHex: String ->
      org.llamenos.core.getPublicKey(secretKeyHex)
    }

    Function("isValidNsec") { nsec: String ->
      org.llamenos.core.isValidNsec(nsec)
    }

    // --- ECIES Key Wrapping ---

    Function("randomBytesHex") {
      org.llamenos.core.randomBytesHex()
    }

    Function("eciesWrapKeyHex") { keyHex: String, recipientPubkeyHex: String, label: String ->
      val env = org.llamenos.core.eciesWrapKeyHex(keyHex, recipientPubkeyHex, label)
      mapOf(
        "wrappedKey" to env.wrappedKey,
        "ephemeralPubkey" to env.ephemeralPubkey,
      )
    }

    Function("eciesUnwrapKeyHex") { envelope: Map<String, Any>, secretKeyHex: String, label: String ->
      val env = org.llamenos.core.KeyEnvelope(
        wrappedKey = envelope["wrappedKey"] as String,
        ephemeralPubkey = envelope["ephemeralPubkey"] as String,
      )
      org.llamenos.core.eciesUnwrapKeyHex(env, secretKeyHex, label)
    }

    // --- Note Encryption ---

    Function("encryptNoteForRecipients") { payloadJson: String, authorPubkey: String, adminPubkeys: List<String> ->
      val enc = org.llamenos.core.encryptNoteForRecipients(payloadJson, authorPubkey, adminPubkeys)
      mapOf(
        "encryptedContent" to enc.encryptedContent,
        "authorEnvelope" to mapOf(
          "wrappedKey" to enc.authorEnvelope.wrappedKey,
          "ephemeralPubkey" to enc.authorEnvelope.ephemeralPubkey,
        ),
        "adminEnvelopes" to enc.adminEnvelopes.map {
          mapOf(
            "pubkey" to it.pubkey,
            "wrappedKey" to it.wrappedKey,
            "ephemeralPubkey" to it.ephemeralPubkey,
          )
        },
      )
    }

    Function("decryptNote") { encryptedContent: String, envelope: Map<String, Any>, secretKeyHex: String ->
      val env = org.llamenos.core.KeyEnvelope(
        wrappedKey = envelope["wrappedKey"] as String,
        ephemeralPubkey = envelope["ephemeralPubkey"] as String,
      )
      org.llamenos.core.decryptNote(encryptedContent, env, secretKeyHex)
    }

    // --- Message Encryption ---

    Function("encryptMessageForReaders") { plaintext: String, readerPubkeys: List<String> ->
      val enc = org.llamenos.core.encryptMessageForReaders(plaintext, readerPubkeys)
      mapOf(
        "encryptedContent" to enc.encryptedContent,
        "readerEnvelopes" to enc.readerEnvelopes.map {
          mapOf(
            "pubkey" to it.pubkey,
            "wrappedKey" to it.wrappedKey,
            "ephemeralPubkey" to it.ephemeralPubkey,
          )
        },
      )
    }

    @Suppress("UNCHECKED_CAST")
    Function("decryptMessageForReader") { encryptedContent: String, readerEnvelopes: List<Map<String, Any>>, secretKeyHex: String, readerPubkey: String ->
      val envs = readerEnvelopes.map {
        org.llamenos.core.RecipientKeyEnvelope(
          pubkey = it["pubkey"] as String,
          wrappedKey = it["wrappedKey"] as String,
          ephemeralPubkey = it["ephemeralPubkey"] as String,
        )
      }
      org.llamenos.core.decryptMessageForReader(encryptedContent, envs, secretKeyHex, readerPubkey)
    }

    // --- Call Record Decryption ---

    @Suppress("UNCHECKED_CAST")
    Function("decryptCallRecordForReader") { encryptedContent: String, adminEnvelopes: List<Map<String, Any>>, secretKeyHex: String, readerPubkey: String ->
      val envs = adminEnvelopes.map {
        org.llamenos.core.RecipientKeyEnvelope(
          pubkey = it["pubkey"] as String,
          wrappedKey = it["wrappedKey"] as String,
          ephemeralPubkey = it["ephemeralPubkey"] as String,
        )
      }
      org.llamenos.core.decryptCallRecordForReader(encryptedContent, envs, secretKeyHex, readerPubkey)
    }

    // --- Draft Encryption ---

    Function("encryptDraft") { plaintext: String, secretKeyHex: String ->
      org.llamenos.core.encryptDraft(plaintext, secretKeyHex)
    }

    Function("decryptDraft") { packedHex: String, secretKeyHex: String ->
      org.llamenos.core.decryptDraft(packedHex, secretKeyHex)
    }

    // --- PIN Key Storage ---

    Function("encryptWithPin") { nsec: String, pin: String, pubkeyHex: String ->
      val data = org.llamenos.core.encryptWithPin(nsec, pin, pubkeyHex)
      mapOf(
        "salt" to data.salt,
        "iterations" to data.iterations,
        "nonce" to data.nonce,
        "ciphertext" to data.ciphertext,
        "pubkey" to data.pubkey,
      )
    }

    Function("decryptWithPin") { data: Map<String, Any>, pin: String ->
      val ekd = org.llamenos.core.EncryptedKeyData(
        salt = data["salt"] as String,
        iterations = (data["iterations"] as Double).toUInt(),
        nonce = data["nonce"] as String,
        ciphertext = data["ciphertext"] as String,
        pubkey = data["pubkey"] as String,
      )
      org.llamenos.core.decryptWithPin(ekd, pin)
    }

    Function("isValidPin") { pin: String ->
      org.llamenos.core.isValidPin(pin)
    }

    Function("deriveKekHex") { pin: String, saltHex: String ->
      org.llamenos.core.deriveKekHex(pin, saltHex)
    }

    // --- Auth ---

    Function("createAuthToken") { secretKeyHex: String, timestamp: Double, method: String, path: String ->
      val token = org.llamenos.core.createAuthToken(secretKeyHex, timestamp.toULong(), method, path)
      mapOf(
        "pubkey" to token.pubkey,
        "timestamp" to token.timestamp,
        "token" to token.token,
      )
    }

    Function("verifyAuthToken") { tokenDict: Map<String, Any>, method: String, path: String ->
      val token = org.llamenos.core.AuthToken(
        pubkey = tokenDict["pubkey"] as String,
        timestamp = (tokenDict["timestamp"] as Double).toULong(),
        token = tokenDict["token"] as String,
      )
      org.llamenos.core.verifyAuthToken(token, method, path)
    }

    Function("verifySchnorr") { messageHex: String, signatureHex: String, pubkeyHex: String ->
      org.llamenos.core.verifySchnorr(messageHex, signatureHex, pubkeyHex)
    }
  }

  companion object {
    init {
      // Load the native Rust library
      System.loadLibrary("llamenos_core")
    }
  }
}
