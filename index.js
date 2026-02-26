// Polyfills must be imported BEFORE any crypto or nostr-tools usage.
// Order matters: crypto → text decoder → router entry.
import { polyfillWebCrypto } from 'expo-standard-web-crypto'
polyfillWebCrypto()

import '@bacons/text-decoder/install'

import 'expo-router/entry'
