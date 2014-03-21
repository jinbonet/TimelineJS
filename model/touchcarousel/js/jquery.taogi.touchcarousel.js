/*  Simple JavaScript Inheritance
	By John Resig http://ejohn.org/
	MIT Licensed.
================================================== */
(function() {
	var initializing = false,
	fnTest = /xyz/.test(function() {
		xyz; 
		}) ? /\b_super\b/: /.*/;
		// The base Class implementation (does nothing)
	this.Class = function() {};
	
	// Create a new Class that inherits from this class
	Class.extend = function(prop) {
		var _super = this.prototype;

		// Instantiate a base class (but only create the instance,
		// don't run the init constructor)
		initializing = true;
		var prototype = new this();
		initializing = false;

		// Copy the properties over onto the new prototype
		for (var name in prop) {
			// Check if we're overwriting an existing function
			prototype[name] = typeof prop[name] == "function" &&
			typeof _super[name] == "function" && fnTest.test(prop[name]) ?
			(function(name, fn) {
				return function() {
					var tmp = this._super;

					// Add a new ._super() method that is the same method
					// but on the super-class
					this._super = _super[name];

					// The method only need to be bound temporarily, so we
					// remove it when we're done executing
					var ret = fn.apply(this, arguments);
					this._super = tmp;

					return ret;
				};
			})(name, prop[name]) :
			prop[name];
		}

		// The dummy class constructor
		function Class() {
			// All construction is actually done in the init method
			if (!initializing && this.init)
			this.init.apply(this, arguments);
		}

		// Populate our constructed prototype object
		Class.prototype = prototype;

		// Enforce the constructor to be what we expect
		Class.prototype.constructor = Class;

		// And make this class extendable
		Class.extend = arguments.callee;

		return Class;
	};
})();

/*  Access to the Global Object
	access the global object without hard-coding the identifier window
================================================== */
var global = (function () {
	return this || (1,eval)('this');
}());

/***********************************************************************
 AES
************************************************************************/
var Aes = {};  // Aes namespace

/**
 * AES Cipher function: encrypt 'input' state with Rijndael algorithm
 *   applies Nr rounds (10/12/14) using key schedule w for 'add round key' stage
 *
 * @param {Number[]} input 16-byte (128-bit) input state array
 * @param {Number[][]} w   Key schedule as 2D byte-array (Nr+1 x Nb bytes)
 * @returns {Number[]}	 Encrypted output state array
 */
Aes.cipher = function(input, w) {	// main Cipher function [§5.1]
	var Nb = 4;			   // block size (in words): no of columns in state (fixed at 4 for AES)
	var Nr = w.length/Nb - 1; // no of rounds: 10/12/14 for 128/192/256-bit keys

	var state = [[],[],[],[]];  // initialise 4xNb byte-array 'state' with input [§3.4]
	for (var i=0; i<4*Nb; i++) state[i%4][Math.floor(i/4)] = input[i];

	state = Aes.addRoundKey(state, w, 0, Nb);

	for (var round=1; round<Nr; round++) {
		state = Aes.subBytes(state, Nb);
		state = Aes.shiftRows(state, Nb);
		state = Aes.mixColumns(state, Nb);
		state = Aes.addRoundKey(state, w, round, Nb);
	}

	state = Aes.subBytes(state, Nb);
	state = Aes.shiftRows(state, Nb);
	state = Aes.addRoundKey(state, w, Nr, Nb);

	var output = new Array(4*Nb);  // convert state to 1-d array before returning [§3.4]
	for (var i=0; i<4*Nb; i++) output[i] = state[i%4][Math.floor(i/4)];
	return output;
}

/**
 * Perform Key Expansion to generate a Key Schedule
 *
 * @param {Number[]} key Key as 16/24/32-byte array
 * @returns {Number[][]} Expanded key schedule as 2D byte-array (Nr+1 x Nb bytes)
 */
Aes.keyExpansion = function(key) {  // generate Key Schedule (byte-array Nr+1 x Nb) from Key [§5.2]
	var Nb = 4;			// block size (in words): no of columns in state (fixed at 4 for AES)
	var Nk = key.length/4  // key length (in words): 4/6/8 for 128/192/256-bit keys
	var Nr = Nk + 6;	   // no of rounds: 10/12/14 for 128/192/256-bit keys

	var w = new Array(Nb*(Nr+1));
	var temp = new Array(4);

	for (var i=0; i<Nk; i++) {
		var r = [key[4*i], key[4*i+1], key[4*i+2], key[4*i+3]];
		w[i] = r;
	}

	for (var i=Nk; i<(Nb*(Nr+1)); i++) {
		w[i] = new Array(4);
		for (var t=0; t<4; t++) temp[t] = w[i-1][t];
		if (i % Nk == 0) {
			temp = Aes.subWord(Aes.rotWord(temp));
			for (var t=0; t<4; t++) temp[t] ^= Aes.rCon[i/Nk][t];
		} else if (Nk > 6 && i%Nk == 4) {
			temp = Aes.subWord(temp);
		}
		for (var t=0; t<4; t++) w[i][t] = w[i-Nk][t] ^ temp[t];
	}

	return w;
}

/*
 * ---- remaining routines are private, not called externally ----
 */
Aes.subBytes = function(s, Nb) {	// apply SBox to state S [§5.1.1]
	for (var r=0; r<4; r++) {
		for (var c=0; c<Nb; c++) s[r][c] = Aes.sBox[s[r][c]];
	}
	return s;
}

Aes.shiftRows = function(s, Nb) {	// shift row r of state S left by r bytes [§5.1.2]
	var t = new Array(4);
	for (var r=1; r<4; r++) {
		for (var c=0; c<4; c++) t[c] = s[r][(c+r)%Nb];  // shift into temp copy
		for (var c=0; c<4; c++) s[r][c] = t[c];		 // and copy back
	}		  // note that this will work for Nb=4,5,6, but not 7,8 (always 4 for AES):
	return s;  // see asmaes.sourceforge.net/rijndael/rijndaelImplementation.pdf
}

Aes.mixColumns = function(s, Nb) {   // combine bytes of each col of state S [§5.1.3]
	for (var c=0; c<4; c++) {
		var a = new Array(4);  // 'a' is a copy of the current column from 's'
		var b = new Array(4);  // 'b' is a•{02} in GF(2^8)
		for (var i=0; i<4; i++) {
			a[i] = s[i][c];
			b[i] = s[i][c]&0x80 ? s[i][c]<<1 ^ 0x011b : s[i][c]<<1;
		}
		// a[n] ^ b[n] is a•{03} in GF(2^8)
		s[0][c] = b[0] ^ a[1] ^ b[1] ^ a[2] ^ a[3]; // 2*a0 + 3*a1 + a2 + a3
		s[1][c] = a[0] ^ b[1] ^ a[2] ^ b[2] ^ a[3]; // a0 * 2*a1 + 3*a2 + a3
		s[2][c] = a[0] ^ a[1] ^ b[2] ^ a[3] ^ b[3]; // a0 + a1 + 2*a2 + 3*a3
		s[3][c] = a[0] ^ b[0] ^ a[1] ^ a[2] ^ b[3]; // 3*a0 + a1 + a2 + 2*a3
	}
	return s;
}

Aes.addRoundKey = function(state, w, rnd, Nb) {  // xor Round Key into state S [§5.1.4]
	for (var r=0; r<4; r++) {
		for (var c=0; c<Nb; c++) state[r][c] ^= w[rnd*4+c][r];
	}
	return state;
}

Aes.subWord = function(w) {	// apply SBox to 4-byte word w
	for (var i=0; i<4; i++) w[i] = Aes.sBox[w[i]];
	return w;
}

Aes.rotWord = function(w) {	// rotate 4-byte word w left by one byte
	var tmp = w[0];
	for (var i=0; i<3; i++) w[i] = w[i+1];
	w[3] = tmp;
	return w;
}

// sBox is pre-computed multiplicative inverse in GF(2^8) used in subBytes and keyExpansion [§5.1.1]
Aes.sBox =  [0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
			 0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
			 0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
			 0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
			 0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
			 0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
			 0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
			 0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
			 0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
			 0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
			 0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
			 0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
			 0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
			 0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
			 0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
			 0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16];

// rCon is Round Constant used for the Key Expansion [1st col is 2^(r-1) in GF(2^8)] [§5.2]
Aes.rCon = [ [0x00, 0x00, 0x00, 0x00],
			 [0x01, 0x00, 0x00, 0x00],
			 [0x02, 0x00, 0x00, 0x00],
			 [0x04, 0x00, 0x00, 0x00],
			 [0x08, 0x00, 0x00, 0x00],
			 [0x10, 0x00, 0x00, 0x00],
			 [0x20, 0x00, 0x00, 0x00],
			 [0x40, 0x00, 0x00, 0x00],
			 [0x80, 0x00, 0x00, 0x00],
			 [0x1b, 0x00, 0x00, 0x00],
			 [0x36, 0x00, 0x00, 0x00] ];

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  AES Counter-mode implementation in JavaScript (c) Chris Veness 2005-2011					  */
/*   - see http://csrc.nist.gov/publications/nistpubs/800-38a/sp800-38a.pdf					   */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

Aes.Ctr = {};  // Aes.Ctr namespace: a subclass or extension of Aes

/** 
 * Encrypt a text using AES encryption in Counter mode of operation
 *
 * Unicode multi-byte character safe
 *
 * @param {String} plaintext Source text to be encrypted
 * @param {String} password  The password to use to generate a key
 * @param {Number} nBits	 Number of bits to be used in the key (128, 192, or 256)
 * @returns {string}		 Encrypted text
 */
Aes.Ctr.encrypt = function(plaintext, password, nBits) {
	var blockSize = 16;  // block size fixed at 16 bytes / 128 bits (Nb=4) for AES
	if (!(nBits==128 || nBits==192 || nBits==256)) return '';  // standard allows 128/192/256 bit keys
	plaintext = Utf8.encode(plaintext);
	password = Utf8.encode(password);
	//var t = new Date();  // timer

	// use AES itself to encrypt password to get cipher key (using plain password as source for key 
	// expansion) - gives us well encrypted key (though hashed key might be preferred for prod'n use)
	var nBytes = nBits/8;  // no bytes in key (16/24/32)
	var pwBytes = new Array(nBytes);
	for (var i=0; i<nBytes; i++) {  // use 1st 16/24/32 chars of password for key
		pwBytes[i] = isNaN(password.charCodeAt(i)) ? 0 : password.charCodeAt(i);
	}
	var key = Aes.cipher(pwBytes, Aes.keyExpansion(pwBytes));  // gives us 16-byte key
	key = key.concat(key.slice(0, nBytes-16));  // expand key to 16/24/32 bytes long

	// initialise 1st 8 bytes of counter block with nonce (NIST SP800-38A §B.2): [0-1] = millisec, 
	// [2-3] = random, [4-7] = seconds, together giving full sub-millisec uniqueness up to Feb 2106
	var counterBlock = new Array(blockSize);

	var nonce = (new Date()).getTime();  // timestamp: milliseconds since 1-Jan-1970
	var nonceMs = nonce%1000;
	var nonceSec = Math.floor(nonce/1000);
	var nonceRnd = Math.floor(Math.random()*0xffff);

	for (var i=0; i<2; i++) counterBlock[i]   = (nonceMs  >>> i*8) & 0xff;
	for (var i=0; i<2; i++) counterBlock[i+2] = (nonceRnd >>> i*8) & 0xff;
	for (var i=0; i<4; i++) counterBlock[i+4] = (nonceSec >>> i*8) & 0xff;

	// and convert it to a string to go on the front of the ciphertext
	var ctrTxt = '';
	for (var i=0; i<8; i++) ctrTxt += String.fromCharCode(counterBlock[i]);

	// generate key schedule - an expansion of the key into distinct Key Rounds for each round
	var keySchedule = Aes.keyExpansion(key);

	var blockCount = Math.ceil(plaintext.length/blockSize);
	var ciphertxt = new Array(blockCount);  // ciphertext as array of strings

	for (var b=0; b<blockCount; b++) {
		// set counter (block #) in last 8 bytes of counter block (leaving nonce in 1st 8 bytes)
		// done in two stages for 32-bit ops: using two words allows us to go past 2^32 blocks (68GB)
		for (var c=0; c<4; c++) counterBlock[15-c] = (b >>> c*8) & 0xff;
		for (var c=0; c<4; c++) counterBlock[15-c-4] = (b/0x100000000 >>> c*8)

		var cipherCntr = Aes.cipher(counterBlock, keySchedule);  // -- encrypt counter block --

		// block size is reduced on final block
		var blockLength = b<blockCount-1 ? blockSize : (plaintext.length-1)%blockSize+1;
		var cipherChar = new Array(blockLength);

		for (var i=0; i<blockLength; i++) {  // -- xor plaintext with ciphered counter char-by-char --
			cipherChar[i] = cipherCntr[i] ^ plaintext.charCodeAt(b*blockSize+i);
			cipherChar[i] = String.fromCharCode(cipherChar[i]);
		}
		ciphertxt[b] = cipherChar.join('');
	}

	// Array.join is more efficient than repeated string concatenation in IE
	var ciphertext = ctrTxt + ciphertxt.join('');
	ciphertext = Base64.encode(ciphertext);  // encode in base64

	//alert((new Date()) - t);
	return ciphertext;
}

/** 
 * Decrypt a text encrypted by AES in counter mode of operation
 *
 * @param {String} ciphertext Source text to be encrypted
 * @param {String} password   The password to use to generate a key
 * @param {Number} nBits	  Number of bits to be used in the key (128, 192, or 256)
 * @returns {String}		  Decrypted text
 */
Aes.Ctr.decrypt = function(ciphertext, password, nBits) {
	var blockSize = 16;  // block size fixed at 16 bytes / 128 bits (Nb=4) for AES
	if (!(nBits==128 || nBits==192 || nBits==256)) return '';  // standard allows 128/192/256 bit keys
	ciphertext = Base64.decode(ciphertext);
	password = Utf8.encode(password);

	// use AES to encrypt password (mirroring encrypt routine)
	var nBytes = nBits/8;  // no bytes in key
	var pwBytes = new Array(nBytes);
	for (var i=0; i<nBytes; i++) {
		pwBytes[i] = isNaN(password.charCodeAt(i)) ? 0 : password.charCodeAt(i);
	}
	var key = Aes.cipher(pwBytes, Aes.keyExpansion(pwBytes));
	key = key.concat(key.slice(0, nBytes-16));  // expand key to 16/24/32 bytes long

	// recover nonce from 1st 8 bytes of ciphertext
	var counterBlock = new Array(8);
	ctrTxt = ciphertext.slice(0, 8);
	for (var i=0; i<8; i++) counterBlock[i] = ctrTxt.charCodeAt(i);

	// generate key schedule
	var keySchedule = Aes.keyExpansion(key);

	// separate ciphertext into blocks (skipping past initial 8 bytes)
	var nBlocks = Math.ceil((ciphertext.length-8) / blockSize);
	var ct = new Array(nBlocks);
	for (var b=0; b<nBlocks; b++) ct[b] = ciphertext.slice(8+b*blockSize, 8+b*blockSize+blockSize);
	ciphertext = ct;  // ciphertext is now array of block-length strings

	// plaintext will get generated block-by-block into array of block-length strings
	var plaintxt = new Array(ciphertext.length);

	for (var b=0; b<nBlocks; b++) {
		// set counter (block #) in last 8 bytes of counter block (leaving nonce in 1st 8 bytes)
		for (var c=0; c<4; c++) counterBlock[15-c] = ((b) >>> c*8) & 0xff;
		for (var c=0; c<4; c++) counterBlock[15-c-4] = (((b+1)/0x100000000-1) >>> c*8) & 0xff;

		var cipherCntr = Aes.cipher(counterBlock, keySchedule);  // encrypt counter block

		var plaintxtByte = new Array(ciphertext[b].length);
		for (var i=0; i<ciphertext[b].length; i++) {
			// -- xor plaintxt with ciphered counter byte-by-byte --
			plaintxtByte[i] = cipherCntr[i] ^ ciphertext[b].charCodeAt(i);
			plaintxtByte[i] = String.fromCharCode(plaintxtByte[i]);
		}
		plaintxt[b] = plaintxtByte.join('');
	}

	// join array of blocks into single plaintext string
	var plaintext = plaintxt.join('');
	plaintext = Utf8.decode(plaintext);  // decode from UTF8 back to Unicode multi-byte chars

	return plaintext;
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Base64 class: Base 64 encoding / decoding (c) Chris Veness 2002-2011						  */
/*	note: depends on Utf8 class																 */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

var Base64 = {};  // Base64 namespace

Base64.code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

/**
 * Encode string into Base64, as defined by RFC 4648 [http://tools.ietf.org/html/rfc4648]
 * (instance method extending String object). As per RFC 4648, no newlines are added.
 *
 * @param {String} str The string to be encoded as base-64
 * @param {Boolean} [utf8encode=false] Flag to indicate whether str is Unicode string to be encoded 
 *   to UTF8 before conversion to base64; otherwise string is assumed to be 8-bit characters
 * @returns {String} Base64-encoded string
 */
Base64.encode = function(str, utf8encode) {  // http://tools.ietf.org/html/rfc4648
	utf8encode =  (typeof utf8encode == 'undefined') ? false : utf8encode;
	var o1, o2, o3, bits, h1, h2, h3, h4, e=[], pad = '', c, plain, coded;
	var b64 = Base64.code;

	plain = utf8encode ? str.encodeUTF8() : str;

	c = plain.length % 3;  // pad string to length of multiple of 3
	if (c > 0) { while (c++ < 3) { pad += '='; plain += '\0'; } }
	// note: doing padding here saves us doing special-case packing for trailing 1 or 2 chars

	for (c=0; c<plain.length; c+=3) {  // pack three octets into four hexets
		o1 = plain.charCodeAt(c);
		o2 = plain.charCodeAt(c+1);
		o3 = plain.charCodeAt(c+2);

		bits = o1<<16 | o2<<8 | o3;

		h1 = bits>>18 & 0x3f;
		h2 = bits>>12 & 0x3f;
		h3 = bits>>6 & 0x3f;
		h4 = bits & 0x3f;

		// use hextets to index into code string
		e[c/3] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
	}
	coded = e.join('');  // join() is far faster than repeated string concatenation in IE

	// replace 'A's from padded nulls with '='s
	coded = coded.slice(0, coded.length-pad.length) + pad;

	return coded;
}

/**
 * Decode string from Base64, as defined by RFC 4648 [http://tools.ietf.org/html/rfc4648]
 * (instance method extending String object). As per RFC 4648, newlines are not catered for.
 *
 * @param {String} str The string to be decoded from base-64
 * @param {Boolean} [utf8decode=false] Flag to indicate whether str is Unicode string to be decoded 
 *   from UTF8 after conversion from base64
 * @returns {String} decoded string
 */
Base64.decode = function(str, utf8decode) {
	utf8decode =  (typeof utf8decode == 'undefined') ? false : utf8decode;
	var o1, o2, o3, h1, h2, h3, h4, bits, d=[], plain, coded;
	var b64 = Base64.code;

	coded = utf8decode ? str.decodeUTF8() : str;

	for (var c=0; c<coded.length; c+=4) {  // unpack four hexets into three octets
		h1 = b64.indexOf(coded.charAt(c));
		h2 = b64.indexOf(coded.charAt(c+1));
		h3 = b64.indexOf(coded.charAt(c+2));
		h4 = b64.indexOf(coded.charAt(c+3));

		bits = h1<<18 | h2<<12 | h3<<6 | h4;

		o1 = bits>>>16 & 0xff;
		o2 = bits>>>8 & 0xff;
		o3 = bits & 0xff;

		d[c/4] = String.fromCharCode(o1, o2, o3);
		// check for padding
		if (h4 == 0x40) d[c/4] = String.fromCharCode(o1, o2);
		if (h3 == 0x40) d[c/4] = String.fromCharCode(o1);
	}
	plain = d.join('');  // join() is far faster than repeated string concatenation in IE

	return utf8decode ? plain.decodeUTF8() : plain;
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Utf8 class: encode / decode between multi-byte Unicode characters and UTF-8 multiple		  */
/*			  single-byte character encoding (c) Chris Veness 2002-2011						 */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

var Utf8 = {};  // Utf8 namespace

/**
 * Encode multi-byte Unicode string into utf-8 multiple single-byte characters
 * (BMP / basic multilingual plane only)
 *
 * Chars in range U+0080 - U+07FF are encoded in 2 chars, U+0800 - U+FFFF in 3 chars
 *
 * @param {String} strUni Unicode string to be encoded as UTF-8
 * @returns {String} encoded string
 */
Utf8.encode = function(strUni) {
	// use regular expressions & String.replace callback function for better efficiency
	// than procedural approaches
	var strUtf = strUni.replace(
		/[\u0080-\u07ff]/g,  // U+0080 - U+07FF => 2 bytes 110yyyyy, 10zzzzzz
		function(c) {
			var cc = c.charCodeAt(0);
			return String.fromCharCode(0xc0 | cc>>6, 0x80 | cc&0x3f);
		}
	);
	strUtf = strUtf.replace(
		/[\u0800-\uffff]/g,  // U+0800 - U+FFFF => 3 bytes 1110xxxx, 10yyyyyy, 10zzzzzz
		function(c) {
			var cc = c.charCodeAt(0);
			return String.fromCharCode(0xe0 | cc>>12, 0x80 | cc>>6&0x3F, 0x80 | cc&0x3f);
		}
	);
	return strUtf;
}

/**
 * Decode utf-8 encoded string back into multi-byte Unicode characters
 *
 * @param {String} strUtf UTF-8 string to be decoded back to Unicode
 * @returns {String} decoded string
 */
Utf8.decode = function(strUtf) {
	// note: decode 3-byte chars first as decoded 2-byte strings could appear to be 3-byte char!
	var strUni = strUtf.replace(
		/[\u00e0-\u00ef][\u0080-\u00bf][\u0080-\u00bf]/g,  // 3-byte chars
		function(c) {  // (note parentheses for precence)
			var cc = ((c.charCodeAt(0)&0x0f)<<12) | ((c.charCodeAt(1)&0x3f)<<6) | ( c.charCodeAt(2)&0x3f);
			return String.fromCharCode(cc);
		}
	);
	strUni = strUni.replace(
		/[\u00c0-\u00df][\u0080-\u00bf]/g, // 2-byte chars
		function(c) {  // (note parentheses for precence)
			var cc = (c.charCodeAt(0)&0x1f)<<6 | c.charCodeAt(1)&0x3f;
			return String.fromCharCode(cc);
		}
	);
	return strUni;
}

/* taogiVMM
================================================== */
/* taogiVMM
================================================== */
if (typeof taogiVMM == 'undefined') {

	/* Main Scope Container
	================================================== */
	//var taogiVMM = {};
	var taogiVMM = Class.extend({});

	/* Debug
	================================================== */
	taogiVMM.debug = true;

	/* Master Config
	================================================== */
	taogiVMM.master_config = ({

		init: function() {
			return this;
		},

		sizes: {
			api: {
				width:			0,
				height:			0
			}
		},

		vp:				"Pellentesque nibh felis, eleifend id, commodo in, interdum vitae, leo",

		api_keys_master: {
			flickr:		"RAIvxHY4hE/Elm5cieh4X5ptMyDpj7MYIxziGxi0WGCcy1s+yr7rKQ==",
			google:		"uQKadH1VMlCsp560gN2aOiMz4evWkl1s34yryl3F/9FJOsn+/948CbBUvKLN46U=",
			twitter:	""
		},

		timers: {
			api:			7000
		},

		api:	{
			pushques:		[]
		},

		twitter: {
			active:			false,
			array:			[],
			api_loaded:		false,
			que:			[]
		},

		flickr: {
			active:			false,
			array:			[],
			api_loaded:		false,
			que:			[]
		},

		youtube: {
			active:			false,
			array:			[],
			api_loaded:		false,
			que:			[]
		},

		vimeo: {
			active:		 false,
			array:		  [],
			api_loaded:	 false,
			que:			[]
		},

		dailymotion: {
			active:		 false,
			array:		  [],
			api_loaded:	 false,
			que:			[]
		},

		vine: {
			active:		 false,
			array:		  [],
			api_loaded:	 false,
			que:			[]
		},

		mediaelements: {
			active:		 false,
			array:		  [],
			api_loaded:	 false,
			que:			[]
		},

		pdf: {
			active:		 false,
			array:		  [],
			api_loaded:	 false,
			que:			[]
		},

		webthumb: {
			active:			false,
			array:			[],
			api_loaded:		false,
			que:			[]
		},

		googlemaps: {
			active:			false,
			thumb_active:	false,
			map_active:		false,
			places_active:	false,
			array:			[],
			api_loaded:		false,
			que:			[]
		},

		googledocs: {
			active:			false,
			array:			[],
			api_loaded:		false,
			que:			[]
		},

		googleplus: {
			active:			false,
			array:			[],
			api_loaded:		false,
			que:			[]
		},

		wikipedia: {
			active:			false,
			array:			[],
			api_loaded:		false,
			que:			[],
			tries:			0
		},

		rigvedawiki: {
			active:			false,
			array:			[],
			api_loaded:		false,
			que:			[],
			tries:			0
		},

		soundcloud: {
			active:			false,
			array:			[],
			api_loaded:		false,
			que:			[]
		},

		iframe: {
			active:			false,
			array:			[],
			api_loaded:		false,
			que:			[]
		},

		attachment: {
			active:		 false,
			array:		  [],
			api_loaded:	 false,
			que:			[]
		},

		languagePack: {},

		snapToItem: false,
		mediaNavHeight: 0

	}).init();
}

/* Trace (console.log) 
================================================== */
function trace( msg ) {
	if (taogiVMM.debug) {
		if (window.console) {
			console.log(msg);
		} else if ( typeof( jsTrace ) != 'undefined' ) {
			jsTrace.send( msg );
		} else {
			//alert(msg);
		}
	}
}

function isIE () {
	var myNav = navigator.userAgent.toLowerCase();
	return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
}
/*  Array Remove - By John Resig (MIT Licensed)
	http://ejohn.org/blog/javascript-array-remove/
================================================== */
Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
}

/* A MORE SPECIFIC TYPEOF();
//  http://rolandog.com/archives/2007/01/18/typeof-a-more-specific-typeof/
================================================== */
// type.of()
var is={
	Null:function(a){return a===null;},
	Undefined:function(a){return a===undefined;},
	nt:function(a){return(a===null||a===undefined);},
	Function:function(a){return(typeof(a)==="function")?a.constructor.toString().match(/Function/)!==null:false;},
	String:function(a){return(typeof(a)==="string")?true:(typeof(a)==="object")?a.constructor.toString().match(/string/i)!==null:false;},
	Array:function(a){return(typeof(a)==="object")?a.constructor.toString().match(/array/i)!==null||a.length!==undefined:false;},
	Boolean:function(a){return(typeof(a)==="boolean")?true:(typeof(a)==="object")?a.constructor.toString().match(/boolean/i)!==null:false;},
	Date:function(a){return(typeof(a)==="date")?true:(typeof(a)==="object")?a.constructor.toString().match(/date/i)!==null:false;},
	HTML:function(a){return(typeof(a)==="object")?a.constructor.toString().match(/html/i)!==null:false;},
	Number:function(a){return(typeof(a)==="number")?true:(typeof(a)==="object")?a.constructor.toString().match(/Number/)!==null:false;},
	Object:function(a){return(typeof(a)==="object")?a.constructor.toString().match(/object/i)!==null:false;},
	RegExp:function(a){return(typeof(a)==="function")?a.constructor.toString().match(/regexp/i)!==null:false;}
};
var type={
	of:function(a){
		for(var i in is){
			if(is[i](a)){
				return i.toLowerCase();
			}
		}
	}
};

function loadingmessage(m) {
	return "<div class='loading'><div class='loading-container'>" + "<div class='message'><p>" + m + "</p></div></div></div>";
}

/*  * LIBRARY ABSTRACTION
================================================== */
if(typeof taogiVMM != 'undefined') {
	taogiVMM.attachElement = function(element, content) {
		if( typeof( jQuery ) != 'undefined' ){
			jQuery(element).html(content);
		}
	};

	taogiVMM.alignattachElement = function(element, content, alignelement, alignopt) {
		if( typeof( jQuery ) != 'undefined' ){
			jQuery(element).html(content).promise().done(function() {
				taogiVMM.Util.alignMiddle(alignelement,alignopt);
			});
		}
	};

	taogiVMM.appendElement = function(element, content) {
		if( typeof( jQuery ) != 'undefined' ){
			jQuery(element).append(content);
		}
	};

	taogiVMM.getHTML = function(element) {
		var e;
		if( typeof( jQuery ) != 'undefined' ){
			e = jQuery(element).html();
			return e;
		}
	};

	taogiVMM.getElement = function(element, p) {
		var e;
		if( typeof( jQuery ) != 'undefined' ){
			if (p) {
				e = jQuery(element).parent().get(0);
			} else {
				e = jQuery(element).get(0);
			}
			return e;
		}
	};

	taogiVMM.getJSON = function(url,data,callback) {
		if( typeof( jQuery ) != 'undefined' ) {
			jQuery.ajaxSetup({
				timeout: 3000
			});

			if ( taogiVMM.Browser.browser == "Explorer" && parseInt(taogiVMM.Browser.version, 10) >= 7 && window.XDomainRequest) {
				var ie_url = url;
				if (ie_url.match('^http://')){
					return jQuery.getJSON(ie_url, data, callback);
				} else if (ie_url.match('^https://')) {
					ie_url = ie_url.replace("https://","http://");
					return jQuery.getJSON(ie_url, data, callback);
				} else {
					return jQuery.getJSON(url, data, callback);
				}
			} else {
				return jQuery.getJSON(url, data, callback);
			}
		}
	}

	taogiVMM.parseJSON = function(the_json) {
		if( typeof( jQuery ) != 'undefined' ){
			return jQuery.parseJSON(the_json);
		}
	}

	taogiVMM.Lib = {

		init: function() {
			return this;
		},

		hide: function(element, duration) {
			if (duration != null && duration != "") {
				if( typeof( jQuery ) != 'undefined' ){
					jQuery(element).hide(duration);
				}
			} else {
				if( typeof( jQuery ) != 'undefined' ){
					jQuery(element).hide();
				}
			}
		},

		remove: function(element) {
			if( typeof( jQuery ) != 'undefined' ){
				jQuery(element).remove();
			}
		},

		detach: function(element) {
			if( typeof( jQuery ) != 'undefined' ){
				jQuery(element).detach();
			}
		},

		append: function(element, value) {
			if( typeof( jQuery ) != 'undefined' ){
				jQuery(element).append(value);
			}
		},

		prepend: function(element, value) {
			if( typeof( jQuery ) != 'undefined' ){
				jQuery(element).prepend(value);
			}
		},

		show: function(element, duration) {
			if (duration != null && duration != "") {
				if( typeof( jQuery ) != 'undefined' ){
					jQuery(element).show(duration);
				}
			} else {
				if( typeof( jQuery ) != 'undefined' ){
					jQuery(element).show();
				}
			}
		},
		load: function(element, callback_function, event_data) {
			var _event_data = {elem:element}; // return element by default
			if (_event_data != null && _event_data != "") {
				_event_data = event_data;
			}
			if( typeof( jQuery ) != 'undefined' ){
				jQuery(element).load(_event_data, callback_function);
			}
		},

		addClass: function(element, cName) {
			if( typeof( jQuery ) != 'undefined' ){
				jQuery(element).addClass(cName);
			}
		},

		removeClass: function(element, cName) {
			if( typeof( jQuery ) != 'undefined' ){
				jQuery(element).removeClass(cName);
			}
		},

		attr: function(element, aName, value) {
			if (value != null && value != "") {
				if( typeof( jQuery ) != 'undefined' ){
					jQuery(element).attr(aName, value);
				}
			} else {
				if( typeof( jQuery ) != 'undefined' ){
					return jQuery(element).attr(aName);
				}
			}
		},

		prop: function(element, aName, value) {
			if (typeof jQuery == 'undefined' || !/[1-9]\.[3-9].[1-9]/.test(jQuery.fn.jquery)) {
				taogiVMM.Lib.attribute(element, aName, value);
			} else {
				jQuery(element).prop(aName, value);
			}
		},

		attribute: function(element, aName, value) {

			if (value != null && value != "") {
				if( typeof( jQuery ) != 'undefined' ){
					jQuery(element).attr(aName, value);
				}
			} else {
				if( typeof( jQuery ) != 'undefined' ){
					return jQuery(element).attr(aName);
				}
			}
		},

		visible: function(element, show) {
			if (show != null) {
				if( typeof( jQuery ) != 'undefined' ){
					if (show) {
						jQuery(element).show(0);
					} else {
						jQuery(element).hide(0);
					}
				}
			} else {
				if( typeof( jQuery ) != 'undefined' ){
					if ( jQuery(element).is(':visible')){
						return true;
					} else {
						return false;
					}
				}
			}
		},

		css: function(element, prop, value) {
			if (value != null && value != "") {
				if( typeof( jQuery ) != 'undefined' ){
					jQuery(element).css(prop, value);
				}
			} else {
				if( typeof( jQuery ) != 'undefined' ){
					return jQuery(element).css(prop);
				}
			}
		},

		cssmultiple: function(element, propval) {
			if( typeof( jQuery ) != 'undefined' ){
				return jQuery(element).css(propval);
			}
		},

		offset: function(element) {
			var p;
			if( typeof( jQuery ) != 'undefined' ){
				p = jQuery(element).offset();
			}
			return p;
		},

		position: function(element) {
			var p;
			if( typeof( jQuery ) != 'undefined' ){
				p = jQuery(element).position();
			}
			return p;
		},

		width: function(element, s) {
			if (s != null && s != "") {
				if( typeof( jQuery ) != 'undefined' ){
					jQuery(element).width(s);
				}
			} else {
				if( typeof( jQuery ) != 'undefined' ){
					return jQuery(element).width();
				}
			}
		},

		height: function(element, s) {
			if (s != null && s != "") {
				if( typeof( jQuery ) != 'undefined' ){
					jQuery(element).height(s);
				}
			} else {
				if( typeof( jQuery ) != 'undefined' ){
					return jQuery(element).height();
				}
			}
		},

		toggleClass: function(element, cName) {
			if( typeof( jQuery ) != 'undefined' ){
				jQuery(element).toggleClass(cName);
			}
		},

		each:function(element, return_function) {
			if( typeof( jQuery ) != 'undefined' ){
				jQuery(element).each(return_function);
			}
		},
	
		html: function(element, str) {
			var e;
/*			if( typeof( jQuery ) != 'undefined' ){
				e = jQuery(element).html();
				return e;
			} */

			if (str != null && str != "") {
				if( typeof( jQuery ) != 'undefined' ){
					jQuery(element).html(str);
				}
			} else {
				var e;
				if( typeof( jQuery ) != 'undefined' ){
					e = jQuery(element).html();
					return e;
				}
			}
		},

		find: function(element, selec) {
			if( typeof( jQuery ) != 'undefined' ){
				return jQuery(element).find(selec);
			}
		},

		stop: function(element) {
			if( typeof( jQuery ) != 'undefined' ){
				jQuery(element).stop();
			}
		}
	}
}

if(typeof taogiVMM != 'undefined' && typeof taogiVMM.Util == 'undefined') {
	taogiVMM.Util = ({
		init: function() {
			return this;
		},

		/*  * GET OBJECT ATTRIBUTE BY INDEX
		================================================== */
		getObjectAttributeByIndex: function(obj, index) {
			if(typeof obj != 'undefined') {
				var i = 0;
				for (var attr in obj){
					if (index === i){
						return obj[attr];
					}
					i++;
				}
				return "";
			} else {
				return "";
			}
		},

		/*  * Turns plain text links into real links
		================================================== */
		linkify: function(text,targets,is_touch) {

			// http://, https://, ftp://
			var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;		  

			// www. sans http:// or https://
			var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;

			// Email addresses
			var emailAddressPattern = /(([a-zA-Z0-9_\-\.]+)@[a-zA-Z_]+?(?:\.[a-zA-Z]{2,6}))+/gim;

			return text
				.replace(urlPattern, "<a target='_blank' href='$&' onclick='void(0)'>$&</a>")
				.replace(pseudoUrlPattern, "$1<a target='_blank' onclick='void(0)' href='http://$2'>$2</a>")	 
				.replace(emailAddressPattern, "<a target='_blank' onclick='void(0)' href='mailto:$1'>$1</a>");
		},

		linkify_with_twitter: function(text,targets,is_touch) {

			// http://, https://, ftp://
			var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;			  
			var url_pattern = /(\()((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(\))|(\[)((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(\])|(\{)((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(\})|(<|&(?:lt|#60|#x3c);)((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(>|&(?:gt|#62|#x3e);)|((?:^|[^=\s'"\]])\s*['"]?|[^=\s]\s+)(\b(?:ht|f)tps?:\/\/[a-z0-9\-._~!$'()*+,;=:\/?#[\]@%]+(?:(?!&(?:gt|#0*62|#x0*3e);|&(?:amp|apos|quot|#0*3[49]|#x0*2[27]);[.!&',:?;]?(?:[^a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]|$))&[a-z0-9\-._~!$'()*+,;=:\/?#[\]@%]*)*[a-z0-9\-_~$()*+=\/#[\]@%])/img;
			var url_replace = '$1$4$7$10$13<a href="$2$5$8$11$14" class="hyphenate">$2$5$8$11$14</a>$3$6$9$12';  

			// www. sans http:// or https://
			var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
			function replaceURLWithHTMLLinks(text) {
				var exp = /(\b(https?|ftp|file):\/\/([-A-Z0-9+&@#%?=~_|!:,.;]*)([-A-Z0-9+&@#%?\/=~_|!:,.;]*)[-A-Z0-9+&@#\/%=~_|])/ig;
				return text.replace(exp, "<a href='$1' target='_blank'>$3</a>");
			}
			// Email addresses
			var emailAddressPattern = /(([a-zA-Z0-9_\-\.]+)@[a-zA-Z_]+?(?:\.[a-zA-Z]{2,6}))+/gim;

			//var twitterHandlePattern = /(@([\w]+))/g;
			var twitterHandlePattern = /\B@([\w-]+)/gm;
			var twitterSearchPattern = /(#([\w]+))/g;

			return text
				//.replace(urlPattern, "<a target='_blank' href='$&' onclick='void(0)'>$&</a>")
				.replace(url_pattern, url_replace)
				.replace(pseudoUrlPattern, "$1<a target='_blank' class='hyphenate' onclick='void(0)' href='http://$2'>$2</a>")
				.replace(emailAddressPattern, "<a target='_blank' onclick='void(0)' href='mailto:$1'>$1</a>")
				.replace(twitterHandlePattern, "<a href='http://twitter.com/$1' target='_blank' onclick='void(0)'>@$1</a>")
				.replace(twitterSearchPattern, "<a href='http://twitter.com/#search?q=%23$2' target='_blank' 'void(0)'>$1</a>");
		},

		linkify_wikipedia: function(text) {

			var urlPattern = /<i[^>]*>(.*?)<\/i>/gim;
			return text
				.replace(urlPattern, "<a target='_blank' href='http://en.wikipedia.org/wiki/$&' onclick='void(0)'>$&</a>")
				.replace(/<i\b[^>]*>/gim, "")
				.replace(/<\/i>/gim, "")
				.replace(/<b\b[^>]*>/gim, "")
				.replace(/<\/b>/gim, "");
		},

		/*  * Turns plain text links into real links
		================================================== */
		unlinkify: function(text) {
			if(!text) return text;
			text = text.replace(/<a\b[^>]*>/i,"");
			text = text.replace(/<\/a>/i, "");
			return text;
		},

		untagify: function(text) {
			if (!text) {
				return text;
			}
			text = text.replace(/<\s*\w.*?>/g,"");
			return text;
		},

		/*  * TK
		================================================== */
		nl2br: function(text) {
			return text.replace(/(\r\n|[\r\n]|\\n|\\r)/g,"<br/>");
		},

		/*  * Generate a Unique ID
		================================================== */
		unique_ID: function(size) {

			var getRandomNumber = function(range) {
				return Math.floor(Math.random() * range);
			};

			var getRandomChar = function() {
				var chars = "abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ";
				return chars.substr( getRandomNumber(62), 1 );
			};

			var randomID = function(size) {
				var str = "";
				for(var i = 0; i < size; i++) {
					str += getRandomChar();
				}
				return str;
			};

			return randomID(size);
		},

		/*  * Tells you if a number is even or not
		================================================== */
		isEven: function(n){
			return (n%2 === 0) ? true : false;
		},
		/*  * Get URL Variables
		================================================== */
		getUrlVars: function(string) {

			var str = string.toString();

			if (str.match('&#038;')) {
				str = str.replace("&#038;", "&");
			} else if (str.match('&#38;')) {
				str = str.replace("&#38;", "&");
			} else if (str.match('&amp;')) {
				str = str.replace("&amp;", "&");
			}

			var vars = [], hash;
			var hashes = str.slice(str.indexOf('?') + 1).split('&');
			for(var i = 0; i < hashes.length; i++) {
				hash = hashes[i].split('=');
				vars.push(hash[0]);
				vars[hash[0]] = hash[1];
			}

			return vars;
		},

		/* make align center/middle with element */
		alignMiddle: function(element,opt) {
			var skipElement = [ 'pdf', 'mediaelements', 'youtube', 'vimeo', 'dailymotion', 'googlemaps', 'googledocs' ];
			if( typeof( jQuery ) != 'undefined' ){
				var obj = jQuery(element);
				var pa = obj.parent();
				if(pa[0].tagName.toLowerCase() == 'a')
					pa = pa.parent();
				var p_width = pa.innerWidth();
				var p_height = pa.innerHeight() - (taogiVMM.master_config.mediaNavHeight ? taogiVMM.master_config.mediaNavHeight : 0);
				var width = 0, height = 0;
				if(obj[0].tagName.toLowerCase() == 'img') {
					var hiddenImg = new Image();
					hiddenImg.onload = function() {
						height = this.height;
						width = this.width;
						p_width = pa.innerWidth();
						p_height = pa.innerHeight() - (taogiVMM.master_config.mediaNavHeight ? taogiVMM.master_config.mediaNavHeight : 0);
						obj.attr({'attr-o-width': width, 'attr-o-height': height});
						var rsize = taogiVMM.Util.resizeImg(obj,width,height,p_width,p_height,opt);
						width = rsize[0];
						height = rsize[1];
						taogiVMM.Util.setMargin(obj,width,height,p_width,p_height);
					}
					hiddenImg.src = obj.attr('src');
				} else if(obj.hasClass('media-shadow') || obj.hasClass('iframe')) {
					var cd = obj.find('iframe');
					if(!cd.length) cd = obj.find('object');
					if(!cd.length) cd = obj.find('embed');
					var w = cd.attr('width');
					var h = cd.attr('height');
					if(!w || !h) return;
					if(w.match(/%/) || h.match(/%/)) {
						cd.ready(function() {
							width = cd.width();
							height = cd.height();
							cd.attr({'attr-o-width': width, 'attr-o-height': height});
							var rsize = taogiVMM.Util.resizeImg(obj,width,height,p_width,p_height,0);
							width = rsize[0];
							height = rsize[1];
							taogiVMM.Util.setMargin(obj,width,height,p_width,p_height);
						});
					} else {
						cd.attr({'attr-o-width': w, 'attr-o-height': h});
						width = parseInt(w);
						height = parseInt(h);

						if(width > p_width) {
							cd.attr('width',p_width);
							width = p_width;
						}
						if(height > p_height) {
							cd.attr('height',p_height);
							height = p_height;
						}
						taogiVMM.Util.setMargin(obj,width,height,p_width,p_height);
					}
				} else {
					var f = 0;
					for(var i=0; i<skipElement.length; i++) {
						if(obj.hasClass(skipElement[i])) return;
					}
					width = obj.outerWidth(true);
					height = obj.outerHeight(true);
					if(obj.find('img').length > 0) {
						obj.find('img').each(function() {
							var self = this;
							var hiddenImg = new Image();
							hiddenImg.onload = function() {
								var h = this.height;
								var w = this.width;
								jQuery(self).attr({'attr-o-width': width, 'attr-o-height': height});
								if(w && p_width && h && p_height) {
									var rsize = taogiVMM.Util.resizeImg(jQuery(self),w,h,p_width,p_height,opt,(obj.hasClass('website') ? true : false));
								}
								width = obj.outerWidth(true);
								height = obj.outerHeight(true);
								if(width && height && p_width && p_height) {
									taogiVMM.Util.setMargin(obj,width,height,p_width,p_height,1);
								}
							}
							hiddenImg.src = jQuery(this).attr('src');
						});
					} else {
						if(!width || !height) return;
						if(!p_width || !p_height) return;
						taogiVMM.Util.setMargin(obj,width,height,p_width,p_height,1);
					}
				}
			}
		},

		reAlignMiddle:function(element,opt) {
			var skipElement = [ 'pdf', 'mediaelements', 'youtube', 'vimeo', 'dailymotion', 'googlemaps', 'googledocs' ];
			if( typeof( jQuery ) != 'undefined' ){
				var obj = jQuery(element);
				if(obj.length < 1) return;
				var pa = obj.parent();
				if(pa[0].tagName.toLowerCase() == 'a')
					pa = pa.parent();
				var p_width = pa.innerWidth();
				var p_height = pa.innerHeight() - (!opt && taogiVMM.master_config.mediaNavHeight ? taogiVMM.master_config.mediaNavHeight : 0);
				var width = 0, height = 0;
				if(obj[0].tagName.toLowerCase() == 'img') {
					width = obj.attr('attr-o-width');
					height = obj.attr('attr-o-height');
					var rsize = taogiVMM.Util.resizeImg(obj,width,height,p_width,p_height,opt);
					width = rsize[0];
					height = rsize[1];
					taogiVMM.Util.setMargin(obj,width,height,p_width,p_height);
				} else if(obj.hasClass('media-shadow') || obj.hasClass('iframe')) {
					var cd = obj.find('iframe');
					if(!cd.length) cd = obj.find('object');
					if(!cd.length) cd = obj.find('embed');
					width = cd.attr('attr-o-width');
					hehgit = cd.attr('attr-o-height');
					if(!width || !height) return;
					if(width.match(/%/) || height.match(/%/)) {
						var rsize = taogiVMM.Util.resizeImg(obj,width,height,p_width,p_height,0);
						width = rsize[0];
						height = rsize[1];
						taogiVMM.Util.setMargin(obj,width,height,p_width,p_height);
					} else {
						width = parseInt(width);
						height = parseInt(height);

						if(width > p_width) {
							cd.attr('width',p_width);
							width = p_width;
						}
						if(height > p_height) {
							cd.attr('height',p_height);
							height = p_height;
						}
						taogiVMM.Util.setMargin(obj,width,height,p_width,p_height);
					}
				} else {
					var f = 0;
					for(var i=0; i<skipElement.length; i++) {
						if(obj.hasClass(skipElement[i])) return;
					}
					if(obj.find('img').length > 0) {
						obj.find('img').each(function() {
							var self = this;
							var h = jQuery(this).attr('attr-o-height');
							var w = jQuery(this).attr('attr-o-width');
							if(w && p_width && h && p_height) {
								var rsize = taogiVMM.Util.resizeImg(jQuery(self),w,h,p_width,p_height,opt,(obj.hasClass('website') ? true : false));
							}
							width = obj.outerWidth(true);
							height = obj.outerHeight(true);
							if(width && height && p_width && p_height) {
								taogiVMM.Util.setMargin(obj,width,height,p_width,p_height,1);
							}
						});
					} else {
						width = obj.outerWidth(true);
						height = obj.outerHeight(true);
						if(!width || !height) return;
						if(!p_width || !p_height) return;
						taogiVMM.Util.setMargin(obj,width,height,p_width,p_height,1);
					}
				}
			}
		},

		resizeImg:function(obj,width,height,p_width,p_height,opt,skip_css_opt) {
			if(width > p_width || height > p_height) {
				if( opt || ((width / height) > (p_width / p_height)) ) {
					var w = p_width;
					var h = Math.round(w * height / width);
				} else {
					var h = p_height;
					var w = Math.round(h * width / height);
				}
				width = w;
				height = h;
				if(skip_css_opt != true) obj.css({'width': w+'px', 'height' : h+'px'});
			} else {
				if(opt) {
					var w = p_width;
					height = Math.round(w * height / width);
					width = w;
					if(skip_css_opt != true) obj.css({'width': w+'px', 'height' : h+'px'});
				}
			}
			return [width,height];
		},

		setMargin:function(obj,width,height,p_width,p_height,opt) {
			var margin_top = 0;
			if(opt && (p_height - height) < 0) {
				obj.addClass('overflow');
				margin_top = 1;
				obj.css('height',p_height);
			}
			if(obj.css('position') == 'relative') {
				obj.css({'left':Math.round((p_width - width) / 2)+'px', 'top':(margin_top ? 0 : Math.round((p_height - height) / 2))+'px'});
			} else {
				obj.css({'margin-left':Math.round((p_width - width) / 2)+'px','margin-top':(margin_top ? 0 : Math.round((p_height - height) / 2))+'px'});
			}
		},

		/* check img src is valify */
		verifyImg:function(element,alignelement,alignopt) {
			if( typeof( jQuery ) != 'undefined' ) {
				var obj = jQuery(element);
				var pa = obj.parent();
				var hiddenImg = new Image();
				hiddenImg.onerror = function() {
					obj.remove();
					if(typeof(pa[0].tagName) != 'undefined' && pa[0].tagName.toLowerCase() == 'a') {
						pa.remove();
					}
					if(alignelement) {
						taogiVMM.Util.alignMiddle(alignelement,alignopt);
					}
				}
				hiddenImg.onload = function() {
					if(alignelement) {	  
						taogiVMM.Util.alignMiddle(alignelement,alignopt);
					}
				}
				hiddenImg.src = obj.attr('src');
			}
		},

		attachThumbnail:function(element,thumbnail,href,className) {
			var imgclass = (className ? className+' ' : '');
			if(thumbnail.match(/png|gif/i)) imgclass='png';
			var mediaEle = '';
			if(href) mediaEle = '<a href="'+href+'" class="snapshot" target="_blank">';
			mediaEle += '<img src="' + thumbnail + '" class="feature_image '+imgclass+'" />';
			if(href) mediaEle += '</a>';
			taogiVMM.alignattachElement(element,mediaEle+"<i></i>", element+' .feature_image',1);
		},

		basename:function(str) {
			var base = new String(str).substring(str.lastIndexOf('/') + 1); 
			if(base.match(/=/)) base = new String(base).substring(base.lastIndexOf('=')+1);
			try {
				base = URIComponent(base);
			} catch(e) {
				base = decodeURIComponent(unescape(base));
			}
			return base;
		},

		getExtension:function(str) {
			var _d = str.split('?&')[0];
			var _ext = _d.split('.');
			return _ext[(_ext.length - 1)];
		},

		/*  * Replaces dumb quote marks with smart ones
		================================================== */
		properQuotes: function(str) {
			return str.replace(/\"([^\"]*)\"/gi,"&#8220;$1&#8221;");
		}
	}).init();
}

if(typeof taogiVMM != 'undefined' && typeof taogiVMM.Date == 'undefined') {
	taogiVMM.Date = ({
		init: function() {
			return this;
		},

		dateformats: {
			year: "yyyy",
			month_short: "mmm",
			month: "mmmm yyyy",
			full_short: "mmm d",
			full: "mmmm d',' yyyy",
			time_no_seconds_short: "h:MM TT",
			time_no_seconds_small_date: "h:MM TT'<br/><small>'mmmm d',' yyyy'</small>'",
			full_long: "mmm d',' yyyy 'at' hh:MM TT",
			full_long_small_date: "hh:MM TT'<br/><small>mmm d',' yyyy'</small>'"
		},

		month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
		month_abbr: ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."],
		day: ["Sunday","Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
		day_abbr: ["Sun.", "Mon.", "Tues.", "Wed.", "Thurs.", "Fri.", "Sat."],
		hour: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
		hour_suffix: ["am"],

		//B.C.
		bc_format: {
			year: "yyyy",
			month_short: "mmm",
			month: "mmmm yyyy",
			full_short: "mmm d",
			full: "mmmm d',' yyyy",
			time_no_seconds_short: "h:MM TT",
			time_no_seconds_small_date: "dddd', 'h:MM TT'<br/><small>'mmmm d',' yyyy'</small>'",
			full_long: "dddd',' mmm d',' yyyy 'at' hh:MM TT",
			full_long_small_date: "hh:MM TT'<br/><small>'dddd',' mmm d',' yyyy'</small>'"
		},

		setLanguage: function(lang) {
			trace("SET DATE LANGUAGE");
			taogiVMM.Date.dateformats		=   lang.dateformats;
			taogiVMM.Date.month			  =   lang.date.month;
			taogiVMM.Date.month_abbr		 =   lang.date.month_abbr;
			taogiVMM.Date.day				=   lang.date.day;
			taogiVMM.Date.day_abbr		   =   lang.date.day_abbr;
			dateFormat.i18n.dayNames	=   lang.date.day_abbr.concat(lang.date.day);
			dateFormat.i18n.monthNames  =   lang.date.month_abbr.concat(lang.date.month);
		},

		parse: function(d) {
			"use strict";
			var date,
				date_array,
				time_array,
				time_parse;

			if (type.of(d) == "date") {
				date = d;
			} else {
				date = new Date(0, 0, 1, 0, 0, 0, 0);

				if ( d.match(/,/gi) ) {
					date_array = d.split(",");
					for(var i = 0; i < date_array.length; i++) {
						date_array[i] = parseInt(date_array[i], 10);
					}
					if (	date_array[0]		   ) { date.setFullYear(	   date_array[0]);		 }
					if (	date_array[1]   > 1	 ) { date.setMonth(		  date_array[1] - 1);	 }
					if (	date_array[2]   > 1	 ) { date.setDate(		   date_array[2]);		 }
					if (	date_array[3]   > 1	 ) { date.setHours(		  date_array[3]);		 }
					if (	date_array[4]   > 1	 ) { date.setMinutes(		date_array[4]);		 }
					if (	date_array[5]   > 1	 ) { date.setSeconds(		date_array[5]);		 }
					if (	date_array[6]   > 1	 ) { date.setMilliseconds(   date_array[6]);		 }
				} else if (d.match("/")) {
					if (d.match(" ")) {
						time_parse = d.split(" ");
						if (d.match(":")) {
							time_array = time_parse[1].split(":");
							if (	time_array[0]   >= 1	) {	 date.setHours(		  time_array[0]); }
							if (	time_array[1]   >= 1	) {	 date.setMinutes(		time_array[1]); }
							if (	time_array[2]   >= 1	) {	 date.setSeconds(		time_array[2]); }
							if (	time_array[3]   >= 1	) {	 date.setMilliseconds(   time_array[3]); }
						}
						date_array = time_parse[0].split("/");
					} else {
						date_array = d.split("/");
					}
					if (	date_array[2]		   ) { date.setFullYear(	   date_array[2]);		 }
					if (	date_array[0]   > 1	 ) { date.setMonth(		  date_array[0] - 1);	 }
					if (	date_array[1]   > 1	 ) { date.setDate(		   date_array[1]);		 }
				} else if (d.match(".")) {
					if (d.match(" ")) {
						time_parse = d.split(" ");
						if (d.match(":")) {
							time_array = time_parse[1].split(":");
							if (	time_array[0]   >= 1	) {	 date.setHours(		  time_array[0]); }
							if (	time_array[1]   >= 1	) {	 date.setMinutes(		time_array[1]); }
							if (	time_array[2]   >= 1	) {	 date.setSeconds(		time_array[2]); }
							if (	time_array[3]   >= 1	) {	 date.setMilliseconds(   time_array[3]); }
						}
						date_array = time_parse[0].split(".");
					} else {
						date_array = d.split(".");
					}
					if (	date_array[0]		   ) { date.setFullYear(	   date_array[0]);		 }
					if (	date_array[1]   > 1	 ) { date.setMonth(		  date_array[1] - 1);	 }
					if (	date_array[2]   > 1	 ) { date.setDate(		   date_array[2]);		 }
				} else if (d.length <= 5) {
					date.setFullYear(parseInt(d, 10));
					date.setMonth(0);
					date.setDate(1);
					date.setHours(0);
					date.setMinutes(0);
					date.setSeconds(0);
					date.setMilliseconds(0);
				} else if (d.match("T")) {
					if (navigator.userAgent.match(/MSIE\s(?!9.0)/)) {
						// IE 8 < Won't accept dates with a "-" in them.
						time_parse = d.split("T");
						if (d.match(":")) {
							time_array = _time_parse[1].split(":");
							if (	time_array[0]   >= 1	) {	 date.setHours(		  time_array[0]); }
							if (	time_array[1]   >= 1	) {	 date.setMinutes(		time_array[1]); }
							if (	time_array[2]   >= 1	) {	 date.setSeconds(		time_array[2]); }
							if (	time_array[3]   >= 1	) {	 date.setMilliseconds(   time_array[3]); }
						}
						_d_array = time_parse[0].split("-");
						if (	date_array[0]		   ) { date.setFullYear(	   date_array[0]);		 }
						if (	date_array[1]   > 1	 ) { date.setMonth(		  date_array[1] - 1);	 }
						if (	date_array[2]   > 1	 ) { date.setDate(		   date_array[2]);		 }

					} else {
						date = new Date(Date.parse(d));
					}
				} else {
					date = new Date(
						parseInt(d.slice(0,4), 10),
						parseInt(d.slice(4,6), 10) - 1,
						parseInt(d.slice(6,8), 10),
						parseInt(d.slice(8,10), 10),
						parseInt(d.slice(10,12), 10)
					);
				}

			}
			return date;
		},

		prettyDate: function(d, is_abbr, p, d2) {
			var _date,
				_date2,
				format,
				bc_check,
				is_pair = false,
				bc_original,
				bc_number,
				bc_string;

			if (d2 != null && d2 != "" && typeof d2 != 'undefined') {
				is_pair = true;
				trace("D2 " + d2);
			}

			if (type.of(d) == "date") {
				if (type.of(p) == "object") {
					if (p.millisecond || p.second || p.minute) {
					// YEAR MONTH DAY HOUR MINUTE
						if (is_abbr){
							format = taogiVMM.Date.dateformats.time_no_seconds_short; 
						} else {
							format = taogiVMM.Date.dateformats.time_no_seconds_small_date;
						}
					} else if (p.hour) {
						// YEAR MONTH DAY HOUR
						if (is_abbr) {
							format = taogiVMM.Date.dateformats.time_no_seconds_short;
						} else {
							format = taogiVMM.Date.dateformats.time_no_seconds_small_date;
						}
					} else if (p.day) {
						// YEAR MONTH DAY
						if (is_abbr) {
							format = taogiVMM.Date.dateformats.full_short;
						} else {
							format = taogiVMM.Date.dateformats.full;
						}
					} else if (p.month) {
						// YEAR MONTH
						if (is_abbr) {
							format = taogiVMM.Date.dateformats.month_short;
						} else {
							format = taogiVMM.Date.dateformats.month;
						}
					} else if (p.year) {
						format = taogiVMM.Date.dateformats.year;
					} else {
						format = taogiVMM.Date.dateformats.year;
					}

				} else {

					if (d.getMonth() === 0 && d.getDate() == 1 && d.getHours() === 0 && d.getMinutes() === 0 ) {
						// YEAR ONLY
						format = taogiVMM.Date.dateformats.year;
					} else if (d.getDate() <= 1 && d.getHours() === 0 && d.getMinutes() === 0) {
						// YEAR MONTH
						if (is_abbr) {
							format = taogiVMM.Date.dateformats.month_short;
						} else {
							format = taogiVMM.Date.dateformats.month;
						}
					} else if (d.getHours() === 0 && d.getMinutes() === 0) {
						// YEAR MONTH DAY
						if (is_abbr) {
							format = taogiVMM.Date.dateformats.full_short;
						} else {
							format = taogiVMM.Date.dateformats.full;
						}
					} else  if (d.getMinutes() === 0) {
						// YEAR MONTH DAY HOUR
						if (is_abbr) {
							format = taogiVMM.Date.dateformats.time_no_seconds_short;
						} else {
							format = taogiVMM.Date.dateformats.time_no_seconds_small_date;
						}
					} else {
						// YEAR MONTH DAY HOUR MINUTE
						if (is_abbr){
							format = taogiVMM.Date.dateformats.time_no_seconds_short; 
						} else {
							format = taogiVMM.Date.dateformats.full_long; 
						}
					}
				}

				_date = dateFormat(d, format, false);
				//_date = "Jan"
				bc_check = _date.split(" ");

				// BC TIME SUPPORT
				for(var i = 0; i < bc_check.length; i++) {
					if ( parseInt(bc_check[i], 10) < 0 ) {
						trace("YEAR IS BC");
						bc_original	= bc_check[i];
						bc_number	= Math.abs( parseInt(bc_check[i], 10) );
						bc_string	= bc_number.toString() + " B.C.";
						_date		= _date.replace(bc_original, bc_string);
					}
				}

				if (is_pair) {
					_date2 = dateFormat(d2, format, false);
					bc_check = _date2.split(" ");
					// BC TIME SUPPORT
					for(var j = 0; j < bc_check.length; j++) {
						if ( parseInt(bc_check[j], 10) < 0 ) {
							trace("YEAR IS BC");
							bc_original	= bc_check[j];
							bc_number	= Math.abs( parseInt(bc_check[j], 10) );
							bc_string	= bc_number.toString() + " B.C.";
							_date2			= _date2.replace(bc_original, bc_string);
						}
					}
	
				}
			} else {
				trace("NOT A VALID DATE?");
				trace(d);
			}

			if (is_pair) {
				return _date + " &mdash; " + _date2;
			} else {
				return _date;
			}
		}
	}).init();

	var dateFormat = function () {
		var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

		// Regexes and supporting functions are cached through closure
		return function (date, mask, utc) {
			var dF = dateFormat;

			// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
			if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
				mask = date;
				date = undefined;
			}

			// Passing date through Date applies Date.parse, if necessary
			// Caused problems in IE
			// date = date ? new Date(date) : new Date;
			if (isNaN(date)) {
				trace("invalid date " + date);
				//return "";
			} 

			mask = String(dF.masks[mask] || mask || dF.masks["default"]);

			// Allow setting the utc argument via the mask
			if (mask.slice(0, 4) == "UTC:") {
				mask = mask.slice(4);
				utc = true;
			}

			var	_ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			D = date[_ + "Day"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:	d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m:	m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:	H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:	H,
				HH:   pad(H),
				M:	M,
				MM:   pad(M),
				s:	s,
				ss:   pad(s),
				l:	pad(L, 3),
				L:	pad(L > 99 ? Math.round(L / 10) : L),
				t:	H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:	H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:	utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:	(o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:	["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

			return mask.replace(token, function ($0) {
				return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
			});
		};
	}();

	// Some common format strings
	dateFormat.masks = {
		"default":	  "ddd mmm dd yyyy HH:MM:ss",
		shortDate:	  "m/d/yy",
		mediumDate:	 "mmm d, yyyy",
		longDate:	   "mmmm d, yyyy",
		fullDate:	   "dddd, mmmm d, yyyy",
		shortTime:	  "h:MM TT",
		mediumTime:	 "h:MM:ss TT",
		longTime:	   "h:MM:ss TT Z",
		isoDate:		"yyyy-mm-dd",
		isoTime:		"HH:MM:ss",
		isoDateTime:	"yyyy-mm-dd'T'HH:MM:ss",
		isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
	};

	// Internationalization strings
	dateFormat.i18n = {
		dayNames: [
			"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
			"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
		],
		monthNames: [
			"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
			"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
		]
	};

	// For convenience...
	Date.prototype.format = function (mask, utc) {
		return dateFormat(this, mask, utc);
	};
}

/* **********************************************
	 Begin LazyLoad.js
********************************************** */

/*jslint browser: true, eqeqeq: true, bitwise: true, newcap: true, immed: true, regexp: false */

/**
LazyLoad makes it easy and painless to lazily load one or more external
JavaScript or CSS files on demand either during or after the rendering of a web
page.

Supported browsers include Firefox 2+, IE6+, Safari 3+ (including Mobile
Safari), Google Chrome, and Opera 9+. Other browsers may or may not work and
are not officially supported.

Visit https://github.com/rgrove/lazyload/ for more info.

Copyright (c) 2011 Ryan Grove <ryan@wonko.com>
All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

@module lazyload
@class LazyLoad
@static
@version 2.0.3 (git)
*/
LazyLoad = (function (doc) {
	// -- Private Variables ------------------------------------------------------

	// User agent and feature test information.
	var env,

	// Reference to the <head> element (populated lazily).
	head,

	// Requests currently in progress, if any.
	pending = {},

	// Number of times we've polled to check whether a pending stylesheet has
	// finished loading. If this gets too high, we're probably stalled.
	pollCount = 0,

	// Queued requests.
	queue = {css: [], js: []},

	// Reference to the browser's list of stylesheets.
	styleSheets = doc.styleSheets;

	// -- Private Methods --------------------------------------------------------

	/**
	Creates and returns an HTML element with the specified name and attributes.

	@method createNode
	@param {String} name element name
	@param {Object} attrs name/value mapping of element attributes
	@return {HTMLElement}
	@private
	*/
	function createNode(name, attrs) {
		var node = doc.createElement(name), attr;

		for (attr in attrs) {
			if (attrs.hasOwnProperty(attr)) {
				node.setAttribute(attr, attrs[attr]);
			}
		}

		return node;
	}

	/**
	Called when the current pending resource of the specified type has finished
	loading. Executes the associated callback (if any) and loads the next
	resource in the queue.

	@method finish
	@param {String} type resource type ('css' or 'js')
	@private
	*/
	function finish(type) {
		var p = pending[type],
			callback,
			urls;

		if (p) {
			callback = p.callback;
			urls	 = p.urls;

			urls.shift();
			pollCount = 0;

			// If this is the last of the pending URLs, execute the callback and
			// start the next request in the queue (if any).
			if (!urls.length) {
				callback && callback.call(p.context, p.obj);
				pending[type] = null;
				queue[type].length && load(type);
			}
		}
	}

	/**
	Populates the <code>env</code> variable with user agent and feature test
	information.

	@method getEnv
	@private
	*/
	function getEnv() {
		var ua = navigator.userAgent;

		env = {
			// True if this browser supports disabling async mode on dynamically
			// created script nodes. See
			// http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order
			async: doc.createElement('script').async === true
		};

		(env.webkit = /AppleWebKit\//.test(ua))
			|| (env.ie = /MSIE/.test(ua))
			|| (env.opera = /Opera/.test(ua))
			|| (env.gecko = /Gecko\//.test(ua))
			|| (env.unknown = true);
	}

	/**
	Loads the specified resources, or the next resource of the specified type
	in the queue if no resources are specified. If a resource of the specified
	type is already being loaded, the new request will be queued until the
	first request has been finished.

	When an array of resource URLs is specified, those URLs will be loaded in
	parallel if it is possible to do so while preserving execution order. All
	browsers support parallel loading of CSS, but only Firefox and Opera
	support parallel loading of scripts. In other browsers, scripts will be
	queued and loaded one at a time to ensure correct execution order.

	@method load
	@param {String} type resource type ('css' or 'js')
	@param {String|Array} urls (optional) URL or array of URLs to load
	@param {Function} callback (optional) callback function to execute when the
		resource is loaded
	@param {Object} obj (optional) object to pass to the callback function
	@param {Object} context (optional) if provided, the callback function will
		be executed in this object's context
	@private
	*/
	function load(type, urls, callback, obj, context) {
		var _finish	= function () { finish(type); },
			isCSS	= type === 'css',
			nodes	= [],
			i, len, node, p, pendingUrls, url;

		env || getEnv();

		if (urls) {
			// If urls is a string, wrap it in an array. Otherwise assume it's an
			// array and create a copy of it so modifications won't be made to the
			// original.
			urls = typeof urls === 'string' ? [urls] : urls.concat();

			// Create a request object for each URL. If multiple URLs are specified,
			// the callback will only be executed after all URLs have been loaded.
			//
			// Sadly, Firefox and Opera are the only browsers capable of loading
			// scripts in parallel while preserving execution order. In all other
			// browsers, scripts must be loaded sequentially.
			//
			// All browsers respect CSS specificity based on the order of the link
			// elements in the DOM, regardless of the order in which the stylesheets
			// are actually downloaded.
			if (isCSS || env.async || env.gecko || env.opera) {
				// Load in parallel.
				queue[type].push({
					urls	: urls,
					callback: callback,
					obj	 : obj,
					context : context
				});
			} else {
				// Load sequentially.
				for (i = 0, len = urls.length; i < len; ++i) {
					queue[type].push({
						urls	: [urls[i]],
						callback: i === len - 1 ? callback : null, // callback is only added to the last URL
						obj		: obj,
						context	: context
					});
				}
			}
		}

		// If a previous load request of this type is currently in progress, we'll
		// wait our turn. Otherwise, grab the next item in the queue.
		if (pending[type] || !(p = pending[type] = queue[type].shift())) {
			return;
		}

		head || (head = doc.head || doc.getElementsByTagName('head')[0]);
		pendingUrls = p.urls;

		for (i = 0, len = pendingUrls.length; i < len; ++i) {
			url = pendingUrls[i];

			if (isCSS) {
				node = env.gecko ? createNode('style') : createNode('link', {
					href: url,
					rel : 'stylesheet'
				});
			} else {
				node = createNode('script', {src: url});
				node.async = false;
			}

			node.className = 'lazyload';
			node.setAttribute('charset', 'utf-8');

			if (env.ie && !isCSS) {
				node.onreadystatechange = function () {
					if (/loaded|complete/.test(node.readyState)) {
						node.onreadystatechange = null;
						_finish();
					}
				};
			} else if (isCSS && (env.gecko || env.webkit)) {
				// Gecko and WebKit don't support the onload event on link nodes.
				if (env.webkit) {
					// In WebKit, we can poll for changes to document.styleSheets to
					// figure out when stylesheets have loaded.
					p.urls[i] = node.href; // resolve relative URLs (or polling won't work)
					pollWebKit();
				} else {
					// In Gecko, we can import the requested URL into a <style> node and
					// poll for the existence of node.sheet.cssRules. Props to Zach
					// Leatherman for calling my attention to this technique.
					node.innerHTML = '@import "' + url + '";';
					pollGecko(node);
				}
			} else {
				node.onload = node.onerror = _finish;
			}

			nodes.push(node);
		}

		for (i = 0, len = nodes.length; i < len; ++i) {
			head.appendChild(nodes[i]);
		}
	}

	/**
	Begins polling to determine when the specified stylesheet has finished loading
	in Gecko. Polling stops when all pending stylesheets have loaded or after 10
	seconds (to prevent stalls).

	Thanks to Zach Leatherman for calling my attention to the @import-based
	cross-domain technique used here, and to Oleg Slobodskoi for an earlier
	same-domain implementation. See Zach's blog for more details:
	http://www.zachleat.com/web/2010/07/29/load-css-dynamically/

	@method pollGecko
	@param {HTMLElement} node Style node to poll.
	@private
	*/
	function pollGecko(node) {
		var hasRules;

		try {
			// We don't really need to store this value or ever refer to it again, but
			// if we don't store it, Closure Compiler assumes the code is useless and
			// removes it.
			hasRules = !!node.sheet.cssRules;
		} catch (ex) {
			// An exception means the stylesheet is still loading.
			pollCount += 1;

			if (pollCount < 200) {
				setTimeout(function () { pollGecko(node); }, 50);
			} else {
				// We've been polling for 10 seconds and nothing's happened. Stop
				// polling and finish the pending requests to avoid blocking further
				// requests.
				hasRules && finish('css');
			}

			return;
		}

		// If we get here, the stylesheet has loaded.
		finish('css');
	}

	/**
	Begins polling to determine when pending stylesheets have finished loading
	in WebKit. Polling stops when all pending stylesheets have loaded or after 10
	seconds (to prevent stalls).

	@method pollWebKit
	@private
	*/
	function pollWebKit() {
		var css = pending.css, i;

		if (css) {
			i = styleSheets.length;

			// Look for a stylesheet matching the pending URL.
			while (--i >= 0) {
				if (styleSheets[i].href === css.urls[0]) {
					finish('css');
					break;
				}
			}

			pollCount += 1;

			if (css) {
				if (pollCount < 200) {
					setTimeout(pollWebKit, 50);
				} else {
					// We've been polling for 10 seconds and nothing's happened, which may
					// indicate that the stylesheet has been removed from the document
					// before it had a chance to load. Stop polling and finish the pending
					// request to prevent blocking further requests.
					finish('css');
				}
			}
		}
	}

	return {

		/**
		Requests the specified CSS URL or URLs and executes the specified
		callback (if any) when they have finished loading. If an array of URLs is
		specified, the stylesheets will be loaded in parallel and the callback
		will be executed after all stylesheets have finished loading.

		@method css
		@param {String|Array} urls CSS URL or array of CSS URLs to load
		@param {Function} callback (optional) callback function to execute when
			the specified stylesheets are loaded
		@param {Object} obj (optional) object to pass to the callback function
		@param {Object} context (optional) if provided, the callback function
			will be executed in this object's context
		@static
		*/
		css: function (urls, callback, obj, context) {
			load('css', urls, callback, obj, context);
		},

		/**
		Requests the specified JavaScript URL or URLs and executes the specified
		callback (if any) when they have finished loading. If an array of URLs is
		specified and the browser supports it, the scripts will be loaded in
		parallel and the callback will be executed after all scripts have
		finished loading.

		Currently, only Firefox and Opera support parallel loading of scripts while
		preserving execution order. In other browsers, scripts will be
		queued and loaded one at a time to ensure correct execution order.

		@method js
		@param {String|Array} urls JS URL or array of JS URLs to load
		@param {Function} callback (optional) callback function to execute when
			the specified scripts are loaded
		@param {Object} obj (optional) object to pass to the callback function
		@param {Object} context (optional) if provided, the callback function
			will be executed in this object's context
		@static
		*/
		js: function (urls, callback, obj, context) {
			load('js', urls, callback, obj, context);
		}
	};
})(this.document);

/* **********************************************
	Begin taogiVMM.LoadLib.js
********************************************** */
/*
	LoadLib
	Designed and built by Zach Wise digitalartwork.net
*/

/*	* CodeKit Import
	* http://incident57.com/codekit/
================================================== */
// @codekit-prepend "../Library/LazyLoad.js";

LoadLib = (function (doc) {
	var loaded  = [];

	function isLoaded(url) {

		var i			= 0,
			has_loaded	= false;

		for (i = 0; i < loaded.length; i++) {
			if (loaded[i] == url) {
				has_loaded = true;
			}
		}

		if (has_loaded) {
			return true;
		} else {
			loaded.push(url);
			return false;
		}
	}

	return {
		css: function (urls, callback, obj, context) {
			if (!isLoaded(urls)) {
				LazyLoad.css(urls, callback, obj, context);
			}
		},

		js: function (urls, callback, obj, context) {
			if (!isLoaded(urls)) {
				LazyLoad.js(urls, callback, obj, context);
			}
		}
	};
})(this.document);

if(typeof taogiVMM != 'undefined' && typeof taogiVMM.Browser == 'undefined') {
	taogiVMM.Browser = {
		init: function () {
			this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
			this.version = this.searchVersion(navigator.userAgent)
				|| this.searchVersion(navigator.appVersion)
				|| "an unknown version";
			this.OS = this.searchString(this.dataOS) || "an unknown OS";
			this.device = this.searchDevice(navigator.userAgent);
			this.orientation = this.searchOrientation(window.orientation);
		},
		searchOrientation: function(orientation) {
			var orient = "";
			if ( orientation == 0  || orientation == 180) {
				orient = "portrait";
			} else if ( orientation == 90 || orientation == -90) {
				orient = "landscape";
			} else {
				orient = "normal";
			}
			return orient;
		},
		searchDevice: function(d) {
			var device = "";
			if (d.match(/Android/i) || d.match(/iPhone|iPod/i)) {
				device = "mobile";
			} else if (d.match(/iPad/i)) {
				device = "tablet";
			} else if (d.match(/BlackBerry/i) || d.match(/IEMobile/i)) {
				device = "other mobile";
			} else {
				device = "desktop";
			}
			return device;
		},
		searchString: function (data) {
			for (var i=0;i<data.length;i++) {
				var dataString  = data[i].string,
					dataProp	= data[i].prop;

				this.versionSearchString = data[i].versionSearch || data[i].identity;

				if (dataString) {
					if (dataString.indexOf(data[i].subString) != -1) {
						return data[i].identity;
					}
				} else if (dataProp) {
					return data[i].identity;
				}
			}
		},
		searchVersion: function (dataString) {
			var index = dataString.indexOf(this.versionSearchString);
			if (index == -1) return;
			return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
		},
		dataBrowser: [
			{
				string: navigator.userAgent,
				subString: "Chrome",
				identity: "Chrome"
			},
			{
				string: navigator.userAgent,
				subString: "OmniWeb",
				versionSearch: "OmniWeb/",
				identity: "OmniWeb"
			},
			{
				string: navigator.vendor,
				subString: "Apple",
				identity: "Safari",
				versionSearch: "Version"
			},
			{
				prop: window.opera,
				identity: "Opera",
				versionSearch: "Version"
			},
			{
				string: navigator.vendor,
				subString: "iCab",
				identity: "iCab"
			},
			{
				string: navigator.vendor,
				subString: "KDE",
				identity: "Konqueror"
			},
			{
				string: navigator.userAgent,
				subString: "Firefox",
				identity: "Firefox"
			},
			{
				string: navigator.vendor,
				subString: "Camino",
				identity: "Camino"
			},
			{	   // for newer Netscapes (6+)
				string: navigator.userAgent,
				subString: "Netscape",
				identity: "Netscape"
			},
			{
				string: navigator.userAgent,
				subString: "MSIE",
				identity: "Explorer",
				versionSearch: "MSIE"
			},
			{
				string: navigator.userAgent,
				subString: "Trident",
				identity: "Explorer",
				versionSearch: "rv"
			},
			{
				string: navigator.userAgent,
				subString: "Gecko",
				identity: "Mozilla",
				versionSearch: "rv"
			},
			{	   // for older Netscapes (4-)
				string: navigator.userAgent,
				subString: "Mozilla",
				identity: "Netscape",
				versionSearch: "Mozilla"
			}
		],
		dataOS : [
			{
				string: navigator.platform,
				subString: "Win",
				identity: "Windows"
			},
			{
				string: navigator.platform,
				subString: "Mac",
				identity: "Mac"
			},
			{
				string: navigator.userAgent,
				subString: "CriOS",
				identity: "CriOS"
			},
			{
				string: navigator.userAgent,
				subString: "iPhone",
				identity: "iPhone/iPod"
			},
			{
				string: navigator.userAgent,
				subString: "iPad",
				identity: "iPad"
			},
			{
				string: navigator.platform,
				subString: "Linux",
				identity: "Linux"
			}
		]
	}
	taogiVMM.Browser.init();
}

/* External API
================================================== */
if(typeof taogiVMM != 'undefined' && typeof taogiVMM.ExternalAPI == 'undefined') {
	
	taogiVMM.ExternalAPI = ({

		keys_master: {  
			vp:		 "Pellentesque nibh felis, eleifend id, commodo in, interdum vitae, leo",
			flickr:	 "RAIvxHY4hE/Elm5cieh4X5ptMyDpj7MYIxziGxi0WGCcy1s+yr7rKQ==",
			google:	 "jwNGnYw4hE9lmAez4ll0QD+jo6SKBJFknkopLS4FrSAuGfIwyj57AusuR0s8dAo=",
			twitter:	""
		},

		init: function() {
			return this;
		},
		
		setKeys: function(d) {
			taogiVMM.ExternalAPI.keys	= d;
		},
		
		pushQues: function() {
			
			if (taogiVMM.master_config.googlemaps.active || taogiVMM.master_config.googlemaps.thumb_active) {
				taogiVMM.ExternalAPI.googlemaps.pushQue();
			}
			if (taogiVMM.master_config.youtube.active) {
				taogiVMM.ExternalAPI.youtube.pushQue();
			}
			if (taogiVMM.master_config.soundcloud.active) {
				taogiVMM.ExternalAPI.soundcloud.pushQue();
			}
			if (taogiVMM.master_config.googledocs.active) {
				taogiVMM.ExternalAPI.googledocs.pushQue();
			}
			if (taogiVMM.master_config.googleplus.active) {
				taogiVMM.ExternalAPI.googleplus.pushQue();
			}
			if (taogiVMM.master_config.wikipedia.active) {
				taogiVMM.ExternalAPI.wikipedia.pushQue();
			}
			if (taogiVMM.master_config.rigvedawiki.active) {
				taogiVMM.ExternalAPI.rigvedawiki.pushQue();
			}
			if (taogiVMM.master_config.vimeo.active) {
				taogiVMM.ExternalAPI.vimeo.pushQue();
			}
			if (taogiVMM.master_config.vine.active) {
				taogiVMM.ExternalAPI.vine.pushQue();
			}
			if (taogiVMM.master_config.dailymotion.active) {
				taogiVMM.ExternalAPI.dailymotion.pushQue();
			}
			if (taogiVMM.master_config.twitter.active) {
				taogiVMM.ExternalAPI.twitter.pushQue();
			}
			if (taogiVMM.master_config.flickr.active) {
				taogiVMM.ExternalAPI.flickr.pushQue();
			}
			if (taogiVMM.master_config.iframe.active) {
				taogiVMM.ExternalAPI.iframe.pushQue();
			}
			if (taogiVMM.master_config.mediaelements.active) {
				taogiVMM.ExternalAPI.mediaelements.pushQue();
			}
			if (taogiVMM.master_config.pdf.active) {
				taogiVMM.ExternalAPI.pdf.pushQue();
			}
			if (taogiVMM.master_config.webthumb.active) {
				taogiVMM.ExternalAPI.webthumb.pushQue();
			}
		},

		MediaType: function(_d) {
			var d	= _d.replace(/^\s\s*/, '').replace(/\s\s*$/, ''),
				success	= false,
				media	= {
					type:		"unknown",
					id:			"",
					start:		0,
					hd:			false,
					link:		"",
					url:		"",
					uid:		"",
					thumb:		0
				};

			if(d.match("div class='twitter'")) {
				media.type = "twitter-ready";
				media.id = d;
				success = true;			
			} else if (d.match('(www.)?youtube\.com|youtu\.be')) {
				if (d.match('v=')) {
					media.id	= taogiVMM.Util.getUrlVars(d)["v"];
				} else if (d.match('\/embed\/')) {
					media.id	= d.split("embed\/")[1].split(/[?&]/)[0];
				} else {
					media.id	= d.split(/v\/|v=|youtu\.be\//)[1].split(/[?&]/)[0];
				}
				media.start = taogiVMM.Util.getUrlVars(d)["t"];
				media.hd	= taogiVMM.Util.getUrlVars(d)["hd"];
				media.type = "youtube";
				media.width = 0;
				media.height = 0;
				success = true;
			} else if (d.match('(player.)?vimeo\.com')) {
				media.type = "vimeo";
				media.id = d.split(/video\/|\/\/vimeo\.com\//)[1].split(/[?&]/)[0];;
				media.width = 0;
				media.height = 0;
				success = true;
			} else if (d.match('(www.)?dailymotion\.com')) {
				media.id = d.split(/video\/|\/\/dailymotion\.com\//)[1];
				media.type = "dailymotion";
				media.width = 0;
				media.height = 0;
				success = true;
			} else if (d.match('(www.)?vine\.co')) {
				trace("VINE");
				//https://vine.co/v/b55LOA1dgJU
				if (d.match("vine.co/v/")) {
					media.id = d.split("vine.co/v/")[1];
					trace(media.id);
				}
				trace(d);
				media.type = "vine";
				success = true;
			} else if (d.match('(player.)?soundcloud\.com')) {
				media.type = "soundcloud";
				media.id = d;
				success = true;
			} else if (d.match('(www.)?twitter\.com') && d.match('status') ) {
				if (d.match("status\/")) {
					media.id = d.split("status\/")[1];
				} else if (d.match("statuses\/")) {
					media.id = d.split("statuses\/")[1];
				} else {
					media.id = "";
				}
				media.type = "twitter";
				success = true;
			} else if (d.match("maps.google") && !d.match("staticmap")) {
				media.type = "google-map";
				media.id = d.split(/src=['|"][^'|"]*?['|"]/gi);
				success = true;
			} else if (d.match("plus.google")) {
				media.type = "googleplus";
				media.id = d.split("/posts/")[1];
				if (d.split("/posts/")[0].match("u/0/")) {
					media.user = d.split("u/0/")[1].split("/posts")[0];
				} else {
					media.user = d.split("google.com/")[1].split("/posts/")[0];
				}
				success = true;
			} else if (d.match("flickr.com/photos")) {
				media.type = "flickr";
				media.id = d.split("photos\/")[1].split("/")[1];
				media.link = d;
				success = true;
			} else if (d.match("instagr.am/p/")) {
				media.type = "instagram";
				media.link = d;
				media.id = d.split("\/p\/")[1].split("/")[0];
				success = true;
			} else if (d.match(/jpg|jpeg|png|gif/i) || d.match("staticmap") || d.match("yfrog.com") || d.match("twitpic.com")) {
				media.type = "image";
				media.id = d;
				success = true;
			} else if (d.match(/\.(mp3|mp4|wmv|flv|avi|ogv|webm)/i)) {
				media.type = "mediaelements";
				media.id = d;
				success = true;
			} else if (d.match(/\.pdf/i)) {
				if(taogiVMM.Browser.device == 'desktop') {
					media.type = "pdf";
				} else {
					media.type = "attachment";
				}
				media.id = d;
				success = true;
			} else if (d.match(/\.(hwp|xls|doc|ppt|dot|od)/i)) {
				media.type = "attachment";
				media.id = d;
				success = true;
			} else if (taogiVMM.ExternalAPI.googleDocType(d)) {
				media.type = "googledoc";
				media.id = d;
				success = true;
			} else if (d.match('(www.)?wikipedia\.org')) {
				media.type = "wikipedia";
				var wiki_id = d.split("wiki\/")[1].split("#")[0].replace("_", " ");
				media.id = wiki_id.replace(" ", "%20");
				media.lang = d.split("//")[1].split(".wikipedia")[0];
				success = true;
			} else if (d.match('(www.)?rigvedawiki\.net')) {
				media.type = "rigvedawiki";
				var wiki_id = d.split("wiki.php\/")[1].split("#")[0].replace("_", " ");
				media.id = wiki_id.replace(" ", "%20");
				success = true;
			} else if (d.match('mirror\.enha\.kr\/wiki\/')) {
				media.type = "rigvedawiki";
				var wiki_id = d.split("wiki\/")[1].split("#")[0].replace("_", " ");
				media.url = "http://rigvedawiki.net/r1/wiki.php/"+media.id;
				media.id = wiki_id.replace(" ", "%20");
				success = true;
			} else if (d.indexOf('http://') == 0) {
				media.type = "website";
				media.id = d;
				success = true;
			} else if (d.match('storify')) {
				media.type = "storify";
				media.id = d;
				success = true;
			} else if (d.match('blockquote')) {
				media.type = "quote";
				media.id = d;
				success = true;
			} else if (d.match('iframe') || d.match('object') || d.match('embed')) {
				media.type = "iframe";
				group = d.match(/src=['"]([^'"]+)['"]/i);
				if (group) {
					media.id = group[1];
				}
				media.url = d;
				success = Boolean(media.id);
			} else {
				trace("unknown media: "+d);
				media.type = "unknown";
				media.id = d;
				success = true;
			}

			if (success) {
				return media;
			}
			return false;
		},

		googleDocType:function(url) {
			var fileName			= url.replace(/\s\s*$/, ''),
				fileExtension		= "",
				validFileExtensions	= ["DOC","DOCX","XLS","XLSX","PPT","PPTX","PDF","PAGES","AI","PSD","TIFF","DXF","SVG","EPS","PS","TTF","XPS","ZIP","RAR"],
				flag				= false;

			fileExtension = fileName.substr(fileName.length - 5, 5);

			for (var i = 0; i < validFileExtensions.length; i++) {
				if (fileExtension.toLowerCase().match(validFileExtensions[i].toString().toLowerCase()) || fileName.match("docs.google.com") ) {
					flag = true;
				}
			}
			return flag;
		},

		twitter: {
			tweetArray: [],

			get: function(m) {
				var tweet = {mid: m.id, id: m.uid, thumb: m.thumb};
				taogiVMM.master_config.twitter.que.push(tweet);
				taogiVMM.master_config.twitter.active = true;
			},

			create: function(tweet, callback) {

				var id				= tweet.mid.toString(),
					error_obj		= { twitterid: tweet.mid };
				if(tweet.thumb) {
					var the_url			= "./library/api.php?type=twitter&taogiauth=ACA20D8B4F7B63D8639C7824AC458D3A53F7E275&endpoint=https://api.twitter.com/1.1/statuses/show.json?id=" + tweet.mid + "&include_entities=true";
				} else {
					var the_url			= "./library/api.php?type=twitter&taogiauth=ACA20D8B4F7B63D8639C7824AC458D3A53F7E275&endpoint=https://api.twitter.com/1.1/statuses/oembed.json&id="+tweet.mid;
//					the_url			+= "&hide_thread=true";
				}
				twitter_timeout	= setTimeout(taogiVMM.ExternalAPI.twitter.errorTimeOut, taogiVMM.master_config.timers.api, tweet),
				callback_timeout= setTimeout(callback, taogiVMM.master_config.timers.api, tweet);

				taogiVMM.getJSON(the_url, function(d) {
					var id		= d.id_str;
					if(tweet.thumb) {
						var twit	= '<div class="blockquote">',
							td		= taogiVMM.Util.linkify_with_twitter(d.text, "_blank");
						twit += "<div class='twitter-icon'><img src=' " + d.user.profile_image_url + "' alt='@" + d.user.screen_name + "'></div>";
						twit += '<h4 class="twitter-account">';
						twit += "<a class='screen-name url' href='https://twitter.com/" + d.user.screen_name + "' data-screen-name='" + d.user.name + "' target='_blank'>";
						twit += "<span class='realname'>" + d.user.name + "</span>";
						twit += "<span class='username'>@" + d.user.screen_name + "</span>";
						twit += '</a>';
						twit += '</h4>';
						twit += '<div class="twitter-date"><a href="' + tweet.mid + '">' + taogiVMM.ExternalAPI.twitter.prettyParseTwitterDate(d.created_at) + '</a></div>';
						twit += '<div class="twitter-text">';
						twit += '<p>' + td + '</p>';

						if (typeof d.entities.media != 'undefined') {
							if (d.entities.media[0].type == "photo") {
								twit += "<img src=' " + d.entities.media[0].media_url + "' alt=''>"
							}
						}
						twit += '</div>';
						twit += '</div>';
					} else {
						var twit	= d.html
					}

					if(tweet.thumb)
						taogiVMM.attachElement("#"+tweet.id.toString(), twit);
					else
						taogiVMM.alignattachElement("#"+tweet.id.toString(), twit,'#'+tweet.id.toString(),0);

				})
				.error(function(jqXHR, textStatus, errorThrown) {
					trace("TWITTER error");
					trace("TWITTER ERROR: " + textStatus + " " + jqXHR.responseText);
					taogiVMM.attachElement("#"+tweet.id, loadingmessage("ERROR LOADING TWEET " + tweet.mid) );
				})
				.success(function(d) {
					clearTimeout(twitter_timeout);
					clearTimeout(callback_timeout);
					callback();
				});
			},

			resize: function(tweet) {
				if(!tweet.thumb) taogiVMM.reAlignMiddle('#'+tweet.id.toString(),0);
			},

			errorTimeOut: function(tweet) {
				trace("TWITTER JSON ERROR TIMEOUT " + tweet.mid);
				taogiVMM.attachElement("#"+tweet.id.toString(), loadingmessage("Still waiting on Twitter: " + tweet.mid) );
				// CHECK RATE STATUS
				taogiVMM.getJSON("http://api.twitter.com/1/account/rate_limit_status.json", function(d) {
					trace("REMAINING TWITTER API CALLS " + d.remaining_hits);
					trace("TWITTER RATE LIMIT WILL RESET AT " + d.reset_time);
					var mes = "";
					if (d.remaining_hits == 0) {
						mes		= 	"<p>You've reached the maximum number of tweets you can load in an hour.</p>";
						mes 	+=	"<p>You can view tweets again starting at: <br/>" + d.reset_time + "</p>";
					} else {
						mes		=	"<p>Still waiting on Twitter. " + tweet.mid + "</p>";
						//mes 	= 	"<p>Tweet " + id + " was not found.</p>";
					}
					taogiVMM.attachElement("#"+tweet.id.toString(), loadingmessage(mes) );
				});
			},

			pushQue: function() {
				if (taogiVMM.master_config.twitter.que.length > 0) {
					taogiVMM.ExternalAPI.twitter.create(taogiVMM.master_config.twitter.que[0], taogiVMM.ExternalAPI.twitter.pushQue);
					taogiVMM.master_config.twitter.que.remove(0);
				}
			},

			getHTML: function(id) {
				//var the_url = document.location.protocol + "//api.twitter.com/1/statuses/oembed.json?id=" + id+ "&callback=?";
				var the_url = "http://api.twitter.com/1/statuses/oembed.json?id=" + id+ "&callback=?";
				taogiVMM.getJSON(the_url, taogiVMM.ExternalAPI.twitter.onJSONLoaded);
			},

			onJSONLoaded: function(d) {
				trace("TWITTER JSON LOADED");
				var id = d.id;
				taogiVMM.attachElement("#"+id, taogiVMM.Util.linkify_with_twitter(d.html) );
			},

			parseTwitterDate: function(d) {
				var date = new Date(Date.parse(d));
				/*
				var t = d.replace(/(\d{1,2}[:]\d{2}[:]\d{2}) (.*)/, '$2 $1');
				t = t.replace(/(\+\S+) (.*)/, '$2 $1');
				var date = new Date(Date.parse(t)).toLocaleDateString();
				var time = new Date(Date.parse(t)).toLocaleTimeString();
				*/
				return date;
			},

			prettyParseTwitterDate: function(d) {
				var date = new Date(Date.parse(d));
				return taogiVMM.Date.prettyDate(date, true);
			},

			getTweets: function(tweets) {
				var tweetArray = [];
				var number_of_tweets = tweets.length;

				for(var i = 0; i < tweets.length; i++) {

					var twitter_id = "";

					/* FIND THE TWITTER ID
					================================================== */
					if (tweets[i].tweet.match("status\/")) {
						twitter_id = tweets[i].tweet.split("status\/")[1];
					} else if (tweets[i].tweet.match("statuses\/")) {
						twitter_id = tweets[i].tweet.split("statuses\/")[1];
					} else {
						twitter_id = "";
					}

					/* FETCH THE DATA
					================================================== */
					var the_url = "http://api.twitter.com/1/statuses/show.json?id=" + twitter_id + "&include_entities=true&callback=?";
					taogiVMM.getJSON(the_url, function(d) {

						var tweet = {}
						/* FORMAT RESPONSE
						================================================== */
						var twit = "<div class='twitter'><blockquote><p>";
						var td = taogiVMM.Util.linkify_with_twitter(d.text, "_blank");
						twit += td;
						twit += "</p>";

						twit += "— " + d.user.name + " (<a href='https://twitter.com/" + d.user.screen_name + "'>@" + d.user.screen_name + "</a>) <a href='https://twitter.com/" + d.user.screen_name + "/status/" + d.id + "'>" + taogiVMM.ExternalAPI.twitter.prettyParseTwitterDate(d.created_at) + " </a></blockquote></div>";

						tweet.content = twit;
						tweet.raw = d;

						tweetArray.push(tweet);

						/* CHECK IF THATS ALL OF THEM
						================================================== */
						if (tweetArray.length == number_of_tweets) {
							var the_tweets = {tweetdata: tweetArray}
							taogiVMM.fireEvent(global, "TWEETSLOADED", the_tweets);
						}
					})
					.success(function() { trace("second success"); })
					.error(function() { trace("error"); })
					.complete(function() { trace("complete"); });
				}
			},
			
			getTweetSearch: function(tweets, number_of_tweets) {
				var _number_of_tweets = 40;
				if (number_of_tweets != null && number_of_tweets != "") {
					_number_of_tweets = number_of_tweets;
				}

				var the_url = "http://search.twitter.com/search.json?q=" + tweets + "&rpp=" + _number_of_tweets + "&include_entities=true&result_type=mixed";
				var tweetArray = [];
				taogiVMM.getJSON(the_url, function(d) {

					/* FORMAT RESPONSE
					================================================== */
					for(var i = 0; i < d.results.length; i++) {
						var tweet = {}
						var twit = "<div class='twitter'><blockquote><p>";
						var td = taogiVMM.Util.linkify_with_twitter(d.results[i].text, "_blank");
						twit += td;
						twit += "</p>";
						twit += "— " + d.results[i].from_user_name + " (<a href='https://twitter.com/" + d.results[i].from_user + "'>@" + d.results[i].from_user + "</a>) <a href='https://twitter.com/" + d.results[i].from_user + "/status/" + d.id + "'>" + taogiVMM.ExternalAPI.twitter.prettyParseTwitterDate(d.results[i].created_at) + " </a></blockquote></div>";
						tweet.content = twit;
						tweet.raw = d.results[i];
						tweetArray.push(tweet);
					}
					var the_tweets = {tweetdata: tweetArray}
					taogiVMM.fireEvent(global, "TWEETSLOADED", the_tweets);
				});
			},

			prettyHTML: function(id, secondary) {
				var id = id.toString();
				var error_obj = {
					twitterid: id
				};
				var the_url = "http://api.twitter.com/1/statuses/show.json?id=" + id + "&include_entities=true&callback=?";
				var twitter_timeout = setTimeout(taogiVMM.ExternalAPI.twitter.errorTimeOut, taogiVMM.master_config.timers.api, id);

				taogiVMM.getJSON(the_url, taogiVMM.ExternalAPI.twitter.formatJSON)
					.error(function(jqXHR, textStatus, errorThrown) {
						trace("TWITTER error");
						trace("TWITTER ERROR: " + textStatus + " " + jqXHR.responseText);
						taogiVMM.attachElement("#"+id, "<p>ERROR LOADING TWEET " + id + "</p>" );
					})
					.success(function(d) {
						clearTimeout(twitter_timeout);
						if (secondary) {
							taogiVMM.ExternalAPI.twitter.secondaryMedia(d);
						}
					});
			},

			formatJSON: function(d) {
				var id = d.id_str;

				var twit = "<blockquote><p>";
				var td = taogiVMM.Util.linkify_with_twitter(d.text, "_blank");
				//td = td.replace(/(@([\w]+))/g,"<a href='http://twitter.com/$2' target='_blank'>$1</a>");
				//td = td.replace(/(#([\w]+))/g,"<a href='http://twitter.com/#search?q=%23$2' target='_blank'>$1</a>");
				twit += td;
				twit += "</p></blockquote>";
				//twit += " <a href='https://twitter.com/" + d.user.screen_name + "/status/" + d.id_str + "' target='_blank' alt='link to original tweet' title='link to original tweet'>" + "<span class='created-at'></span>" + " </a>";

				twit += "<div class='vcard author'>";
				twit += "<a class='screen-name url' href='https://twitter.com/" + d.user.screen_name + "' data-screen-name='" + d.user.screen_name + "' target='_blank'>";
				twit += "<span class='avatar'><img src=' " + d.user.profile_image_url + "' class='feature_image' alt=''></span>";
				twit += "<span class='fn'>" + d.user.name + "</span>";
				twit += "<span class='nickname'>@" + d.user.screen_name + "<span class='thumbnail-inline'></span></span>";
				twit += "</a>";
				twit += "</div>";

				if (typeof d.entities.media != 'undefined') {
					if (d.entities.media[0].type == "photo") {
						twit += "<img src=' " + d.entities.media[0].media_url + "' class='feature_image' alt=''>"
					}
				}

				taogiVMM.attachElement("#"+id.toString(), twit );
//				taogiVMM.attachElement("#twitter_text_thumb_"+id.toString(), d.text );
			}
		},

		googlemaps: {

			maptype: "TERRAIN",

			setMapType: function(d) {
				if (d != "") {
					taogiVMM.ExternalAPI.googlemaps.maptype = d;
				}
			},

			get: function(m) {
				var timer,
					api_key,
					map_url;
				
				m.vars = taogiVMM.Util.getUrlVars(m.id);
				
				if (taogiVMM.master_config.Timeline.api_keys.google != "") {
					api_key = taogiVMM.master_config.Timeline.api_keys.google;
				} else {
					api_key = Aes.Ctr.decrypt(taogiVMM.master_config.api_keys_master.google, taogiVMM.master_config.vp, 256);
				}
				var map_url = "//maps.googleapis.com/maps/api/js?key=" + api_key + "&v=3.9&libraries=places&sensor=false&callback=taogiVMM.ExternalAPI.googlemaps.onMapAPIReady";

				if(m.thumb != 1) {
					if (taogiVMM.master_config.googlemaps.active) {
						taogiVMM.master_config.googlemaps.que.push(m);
					} else {
						taogiVMM.master_config.googlemaps.que.push(m);

						if (taogiVMM.master_config.googlemaps.api_loaded) {

						} else {
							LoadLib.js(map_url, function() {
								trace("Google Maps API Library Loaded");
							});
						}
					}
				} else {
					trace("google static map push");
					taogiVMM.master_config.googlemaps.que.push(m);
					taogiVMM.master_config.googlemaps.thumb_active = true;
				}
			},

			create: function(m) {
				taogiVMM.ExternalAPI.googlemaps.createAPIMap(m);
			},

			resize: function(m) {
			},

			createiFrameMap: function(m) {
				var embed_url	   = m.id + "&output=embed",
					mc			  = "",
					unique_map_id   = m.uid.toString() + "_gmap";

				mc	+= "<div class='googlemap noSwipe' id='" + unique_map_id + "' style='width:100%;height:100%;'>";
				mc	+= "<iframe width='100%' height='100%' frameborder='0' scrolling='no' marginheight='0' marginwidth='0' src='" + embed_url + "'></iframe>";
				mc	+= "</div>";

				taogiVMM.attachElement("#" + m.uid, mc);
			},

			createAPIMap: function(m) {
				var map_attribution = "",
					layer,
					map,
					map_options,
					unique_map_id		   = m.uid.toString() + "_gmap",
					map_attribution_html	= "",
					location				= new google.maps.LatLng(41.875696,-87.624207),
					latlong,
					zoom					= 11,
					has_location			= false,
					has_zoom				= false,
					api_limit				= false,
					map_bounds;

				function mapProvider(name) {
					if (name in taogiVMM.ExternalAPI.googlemaps.map_providers) {
						map_attribution = taogiVMM.ExternalAPI.googlemaps.map_attribution[taogiVMM.ExternalAPI.googlemaps.map_providers[name].attribution];
						return taogiVMM.ExternalAPI.googlemaps.map_providers[name];
					} else {
						if (taogiVMM.ExternalAPI.googlemaps.defaultType(name)) {
							trace("GOOGLE MAP DEFAULT TYPE");
							return google.maps.MapTypeId[name.toUpperCase()];
						} else {
							trace("Not a maptype: " + name );
						}
					}
				}

				google.maps.VeriteMapType = function(name) {
					if (taogiVMM.ExternalAPI.googlemaps.defaultType(name)) {
						return google.maps.MapTypeId[name.toUpperCase()];
					} else {
						var provider = 			mapProvider(name);
						return google.maps.ImageMapType.call(this, {
							"getTileUrl": function(coord, zoom) {
								var index = 	(zoom + coord.x + coord.y) % taogiVMM.ExternalAPI.googlemaps.map_subdomains.length;
								var retURL =  provider.url
										.replace("{S}", VMM.ExternalAPI.googlemaps.map_subdomains[index])
										.replace("{Z}", zoom)
										.replace("{X}", coord.x)
										.replace("{Y}", coord.y)
										.replace("{z}", zoom)
										.replace("{x}", coord.x)
										.replace("{y}", coord.y);

								return retURL;
							},
							"tileSize": 		new google.maps.Size(256, 256),
							"name":				name,
							"minZoom":			provider.minZoom,
							"maxZoom":			provider.maxZoom
						});
					}
				};

				google.maps.VeriteMapType.prototype = new google.maps.ImageMapType("_");

				/* Make the Map
				================================================== */
				if (taogiVMM.master_config.Timeline.maptype != "") {
					if (taogiVMM.ExternalAPI.googlemaps.defaultType(taogiVMM.master_config.Timeline.maptype)) {
						layer				=	google.maps.MapTypeId[taogiVMM.master_config.Timeline.maptype.toUpperCase()];
					} else {
						layer				=	VMM.ExternalAPI.googlemaps.maptype;
					}
				} else {
					layer					=	google.maps.MapTypeId['TERRAIN'];
				}

				if (type.of(taogiVMM.Util.getUrlVars(m.id)["ll"]) == "string") {
					has_location			=	true;
					latlong					=	taogiVMM.Util.getUrlVars(m.id)["ll"].split(",");
					location				=	new google.maps.LatLng(parseFloat(latlong[0]),parseFloat(latlong[1]));

				} else if (type.of(taogiVMM.Util.getUrlVars(m.id)["sll"]) == "string") {
					latlong					=	taogiVMM.Util.getUrlVars(m.id)["sll"].split(",");
					location				=	new google.maps.LatLng(parseFloat(latlong[0]),parseFloat(latlong[1]));
				} 

				if (type.of(taogiVMM.Util.getUrlVars(m.url)["z"]) == "string") {
					has_zoom				=	true;
					zoom					=	parseFloat(taogiVMM.Util.getUrlVars(m.id)["z"]);
				}

				var map_options = {
					zoom:						zoom,
					draggable:					true,
					disableDefaultUI:			true,
					mapTypeControl:				false,
					zoomControl:				true,
					zoomControlOptions: {
						style:					google.maps.ZoomControlStyle.SMALL,
						position:				google.maps.ControlPosition.TOP_RIGHT
					},
					center: 					location,
					mapTypeId:					layer,
					mapTypeControlOptions: {
						mapTypeIds:				[layer]
					}
				}

				taogiVMM.attachElement("#" + m.uid, "<div class='googlemap noSwipe' id='" + unique_map_id + "' style='width:100%;height:100%;'></div>");
				
				map		=	new google.maps.Map(document.getElementById(unique_map_id), map_options);
				
				if (taogiVMM.ExternalAPI.googlemaps.defaultType(taogiVMM.master_config.Timeline.maptype)) {
					
				} else {
					map.mapTypes.set(layer, new google.maps.VeriteMapType(layer));
					// ATTRIBUTION
					map_attribution_html =	"<div class='map-attribution'><div class='attribution-text'>" + map_attribution + "</div></div>";
					taogiVMM.appendElement("#"+unique_map_id, map_attribution_html);
				}
				
				// DETERMINE IF KML IS POSSIBLE
				if (type.of(taogiVMM.Util.getUrlVars(m.id)["msid"]) == "string") {
					loadKML();
				} else {
					//loadPlaces();
					if (type.of(taogiVMM.Util.getUrlVars(m.id)["q"]) == "string") {
						geocodePlace();
					}
				}

				// GEOCODE	  
				function geocodePlace() {
					var geocoder	= new google.maps.Geocoder(),
						address	 = taogiVMM.Util.getUrlVars(m.id)["q"],
						marker;
						
					if (address.match("loc:")) {
						var address_latlon = address.split(":")[1].split("+");
						location = new google.maps.LatLng(parseFloat(address_latlon[0]),parseFloat(address_latlon[1]));
						has_location = true;
					}

					geocoder.geocode( { 'address': address}, function(results, status) {
						if (status == google.maps.GeocoderStatus.OK) {
							marker = new google.maps.Marker({
								map: map,
								position: results[0].geometry.location
							});

							// POSITION MAP
							//map.setCenter(results[0].geometry.location);
							//map.panTo(location);
							if (typeof results[0].geometry.viewport != 'undefined') {
								map.fitBounds(results[0].geometry.viewport);
							} else if (typeof results[0].geometry.bounds != 'undefined') {
								map.fitBounds(results[0].geometry.bounds);
							} else {
								map.setCenter(results[0].geometry.location);
							}

							if (has_location) {
								map.panTo(location);
							}
							if (has_zoom) {
								map.setZoom(zoom);
							}

						} else {
							trace("Geocode for " + address + " was not successful for the following reason: " + status);
							trace("TRYING PLACES SEARCH");

							if (has_location) {
								map.panTo(location);
							}
							if (has_zoom) {
								map.setZoom(zoom);
							}

							loadPlaces();
						}
					});
				}

				// PLACES
				function loadPlaces() {
					var place,
						search_request,
						infowindow,
						search_bounds,
						bounds_sw,
						bounds_ne;

					place_search	= new google.maps.places.PlacesService(map);
					infowindow		= new google.maps.InfoWindow();

					search_request = {
						query:		"",
						types:		['country', 'neighborhood', 'political', 'locality', 'geocode']
					};

					if (type.of(taogiVMM.Util.getUrlVars(m.id)["q"]) == "string") {
						search_request.query	= taogiVMM.Util.getUrlVars(m.id)["q"];
					}

					if (has_location) {
						search_request.location	= location;
						search_request.radius	= "15000";
					} else {
						bounds_sw = new google.maps.LatLng(-89.999999,-179.999999);
						bounds_ne = new google.maps.LatLng(89.999999,179.999999);
						search_bounds = new google.maps.LatLngBounds(bounds_sw,bounds_ne);

						//search_request.location   = search_bounds;
					}

					place_search.textSearch(search_request, placeResults);

					function placeResults(results, status) {
						if (status == google.maps.places.PlacesServiceStatus.OK) {
							for (var i = 0; i < results.length; i++) {
								//createMarker(results[i]);
							}

							if (has_location) {
								map.panTo(location);
							} else {
								if (results.length >= 1) {
									map.panTo(results[0].geometry.location);
									if (has_zoom) {
										map.setZoom(zoom);
									}
								}
							}
						} else {
							trace("Place search for " + search_request.query + " was not successful for the following reason: " + status);
							// IF There's a problem loading the map, load a simple iFrame version instead
							trace("YOU MAY NEED A GOOGLE MAPS API KEY IN ORDER TO USE THIS FEATURE OF TIMELINEJS");
							trace("FIND OUT HOW TO GET YOUR KEY HERE: https://developers.google.com/places/documentation/#Authentication");

							if (has_location) {
								map.panTo(location);
								if (has_zoom) {
									map.setZoom(zoom);
								}
							} else {
								trace("USING SIMPLE IFRAME MAP EMBED");
								if (m.id[0].match("https")) {
									m.id = m.url.replace("https", "http");
								}
								taogiVMM.ExternalAPI.googlemaps.createiFrameMap(m);
							}
						}
					}

					function createMarker(place) {
						var marker, placeLoc;

						placeLoc = place.geometry.location;
						marker = new google.maps.Marker({
							map: map,
							position: place.geometry.location
						});

						google.maps.event.addListener(marker, 'click', function() {
							infowindow.setContent(place.name);
							infowindow.open(map, this);
						});
					}

				}

				function loadPlacesAlt() {
					var api_key,
						places_url,
						has_key = false;

					trace("LOADING PLACES API FOR GOOGLE MAPS");

					if (taogiVMM.ExternalAPI.keys.google != "") {
						api_key = taogiVMM.ExternalAPI.keys.google;
						has_key = true;
					} else {
						trace("YOU NEED A GOOGLE MAPS API KEY IN ORDER TO USE THIS FEATURE OF TIMELINEJS");
						trace("FIND OUT HOW TO GET YOUR KEY HERE: https://developers.google.com/places/documentation/#Authentication");
					}
								
					places_url = "https://maps.googleapis.com/maps/api/place/textsearch/json?key=" + api_key + "&sensor=false&language=" + m.lang + "&";

					if (type.of(taogiVMM.Util.getUrlVars(m.id)["q"]) == "string") {
						places_url  += "query=" + taogiVMM.Util.getUrlVars(m.id)["q"];
					}

					if (has_location) {
						places_url  += "&location=" + location;
					}	   

					if (has_key) {
						taogiVMM.getJSON(places_url, function(d) {
							trace("PLACES JSON");
						
							var places_location		= "",
								places_bounds		= "",
								places_bounds_ne	= "",
								places_bounds_sw	= "";

							trace(d);

							if (d.status == "OVER_QUERY_LIMIT") {
								trace("OVER_QUERY_LIMIT");
								if (has_location) {
									map.panTo(location);
									if (has_zoom) {
										map.setZoom(zoom);
									}
								} else {
									trace("DOING TRADITIONAL MAP IFRAME EMBED UNTIL QUERY LIMIT RESTORED");
									api_limit = true;
									taogiVMM.ExternalAPI.googlemaps.createiFrameMap(m);
								}
							} else {
								if (d.results.length >= 1) {
									//location = new google.maps.LatLng(parseFloat(d.results[0].geometry.location.lat),parseFloat(d.results[0].geometry.location.lng));
									//map.panTo(location);

									places_bounds_ne	= new google.maps.LatLng(parseFloat(d.results[0].geometry.viewport.northeast.lat),parseFloat(d.results[0].geometry.viewport.northeast.lng));
									places_bounds_sw	= new google.maps.LatLng(parseFloat(d.results[0].geometry.viewport.southwest.lat),parseFloat(d.results[0].geometry.viewport.southwest.lng));

									places_bounds = new google.maps.LatLngBounds(places_bounds_sw, places_bounds_ne)
									map.fitBounds(places_bounds);
								} else {
									trace("NO RESULTS");
								}

								if (has_location) {
									map.panTo(location);
								}
								if (has_zoom) {
									map.setZoom(zoom);
								}
							}
						})
						.error(function(jqXHR, textStatus, errorThrown) {
							trace("PLACES JSON ERROR");
							trace("PLACES JSON ERROR: " + textStatus + " " + jqXHR.responseText);
						})
						.success(function(d) {
							trace("PLACES JSON SUCCESS");
						});
					} else {
						if (has_location) {
							map.panTo(location);
							if (has_zoom) {
								map.setZoom(zoom);
							}
						} else {
							trace("DOING TRADITIONAL MAP IFRAME EMBED BECAUSE NO GOOGLE MAP API KEY WAS PROVIDED");
							taogiVMM.ExternalAPI.googlemaps.createiFrameMap(m);
						}
					}
				}

				// KML
				function loadKML() {
					var kml_url, kml_layer, infowindow, text;

					kml_url				=	m.id + "&output=kml";
					kml_url				=	kml_url.replace("&output=embed", "");
					kml_layer			=	new google.maps.KmlLayer(kml_url, {preserveViewport:true});
					infowindow			=	new google.maps.InfoWindow();
					kml_layer.setMap(map);

					google.maps.event.addListenerOnce(kml_layer, "defaultviewport_changed", function() {
						if (has_location) {
							map.panTo(location);
						}  else {
							map.fitBounds(kml_layer.getDefaultViewport() );
						}
						if (has_zoom) {
							map.setZoom(zoom);
						}
					});
					
					google.maps.event.addListener(kml_layer, 'click', function(kmlEvent) {
						var text			=	kmlEvent.featureData.description;
						showInfoWindow(text);
						
						function showInfoWindow(c) {
							infowindow.setContent(c);
							infowindow.open(map);
						}
					});
				}
				
			},

			createThumb: function(m) {
				trace("create static google map");
				/* Make the MapURL
				================================================== */
				if (type.of(taogiVMM.master_config.Timeline.maptype) == "string") {
					var layer				= taogiVMM.master_config.Timeline.maptype;
				} else {
					var layer				= "toner";
				}

				var e = taogiVMM.getElement('#'+m.uid);
				if(e) {
					var thumb_width = taogiVMM.Lib.attr(e,'width');
					var thumb_height = taogiVMM.Lib.attr(e,'height');
				}
				if (thumb_width && thumb_height) {
					var size 				= thumb_width+"x"+thumb_height;
				} else {
					var size				= "216x252";
				}

				var location;
				var zoom					= 11;
				var has_location			= false;
				var center;
				
				if (type.of(taogiVMM.Util.getUrlVars(m.url)["q"]) == "string") {
					center = taogiVMM.Util.getUrlVars(m.url)["q"];
				}
				if (type.of(taogiVMM.Util.getUrlVars(m.url)["ll"]) == "string") {
					has_location			= true;
					location				= taogiVMM.Util.getUrlVars(m.url)["ll"];
				} else if (type.of(taogiVMM.Util.getUrlVars(m.url)["sll"]) == "string") {
					location				= taogiVMM.Util.getUrlVars(m.url)["sll"];
				}

				if (type.of(taogiVMM.Util.getUrlVars(m.url)["z"]) == "string") {
					zoom					= parseFloat(taogiVMM.Util.getUrlVars(m.url)["z"]);
				}

				var the_url = "http://maps.google.com/maps/api/staticmap?center="+center;
				the_url += "&zoom="+zoom;
				the_url += "&size="+size;
				the_url += "&maptype="+layer;
				if(has_location) the_url += "&markers="+location;
				the_url += "&sensor=false";

				taogiVMM.attachElement("#" + m.uid, "<img class='googlemap feature_image' src='" + the_url + "' /><h5 class='caption'>"+center+"</h5><i></i>");
			},
			
			pushQue: function() {
				for(var i = 0; i < taogiVMM.master_config.googlemaps.que.length; i++) {
					if(taogiVMM.master_config.googlemaps.que[i].thumb && taogiVMM.master_config.googlemaps.thumb_active) {
						if(!taogiVMM.master_config.googlemaps.que[i].active) {
							trace("pushQue google static map");
							taogiVMM.ExternalAPI.googlemaps.createThumb(taogiVMM.master_config.googlemaps.que[i]);
							taogiVMM.master_config.googlemaps.que[i].active = true;
						}
					} else {
						trace("pushQue google map");
						if(taogiVMM.master_config.googlemaps.active && !taogiVMM.master_config.googlemaps.que[i].active) {
							trace("pushQue google map with api");
							taogiVMM.ExternalAPI.googlemaps.create(taogiVMM.master_config.googlemaps.que[i]);
							taogiVMM.master_config.googlemaps.que[i].active = true;
						}
					}
				}
//				taogiVMM.master_config.googlemaps.que = [];
			},
			
			onMapAPIReady: function() {
				taogiVMM.master_config.googlemaps.map_active = true;
				taogiVMM.master_config.googlemaps.places_active = true;
				taogiVMM.ExternalAPI.googlemaps.onAPIReady();
			},
			
			onPlacesAPIReady: function() {
				taogiVMM.master_config.googlemaps.places_active = true;
				taogiVMM.ExternalAPI.googlemaps.onAPIReady();
			},
			
			onAPIReady: function() {
				if (!taogiVMM.master_config.googlemaps.active) {
					if (taogiVMM.master_config.googlemaps.map_active && taogiVMM.master_config.googlemaps.places_active) {
						taogiVMM.master_config.googlemaps.active = true;
						taogiVMM.ExternalAPI.googlemaps.pushQue();
					}
				}
			},
			
			defaultType: function(name) {
				if (name.toLowerCase() == "satellite" || name.toLowerCase() == "hybrid" || name.toLowerCase() == "terrain" || name.toLowerCase() == "roadmap") {
					return true;
				} else {
					return false;
				}
			},
			
			map_subdomains: ["", "a.", "b.", "c.", "d."],
			
			map_attribution: {
				"stamen": 			"Map tiles by <a href='http://stamen.com'>Stamen Design</a>, under <a href='http://creativecommons.org/licenses/by/3.0'>CC BY 3.0</a>. Data by <a href='http://openstreetmap.org'>OpenStreetMap</a>, under <a href='http://creativecommons.org/licenses/by-sa/3.0'>CC BY SA</a>.",
				"apple": 			"Map data &copy; 2012  Apple, Imagery &copy; 2012 Apple"
			},
						
			map_providers: {
				"toner": {
					"url": 			"http://{S}tile.stamen.com/toner/{Z}/{X}/{Y}.png",
					"minZoom": 		0,
					"maxZoom": 		20,
					"attribution": 	"stamen"
					
				},
				"toner-lines": {
					"url": 			"http://{S}tile.stamen.com/toner-lines/{Z}/{X}/{Y}.png",
					"minZoom": 		0,
					"maxZoom": 		20,
					"attribution": 	"stamen"
				},
				"toner-labels": {
					"url": 			"http://{S}tile.stamen.com/toner-labels/{Z}/{X}/{Y}.png",
					"minZoom": 		0,
					"maxZoom": 		20,
					"attribution": 	"stamen"
				},
				"sterrain": {
					"url": 			"http://{S}tile.stamen.com/terrain/{Z}/{X}/{Y}.jpg",
					"minZoom": 		4,
					"maxZoom": 		20,
					"attribution": 	"stamen"
				},
				"apple": {
					"url": 			"http://gsp2.apple.com/tile?api=1&style=slideshow&layers=default&lang=en_US&z={z}&x={x}&y={y}&v=9",
					"minZoom": 		4,
					"maxZoom": 		14,
					"attribution": 	"apple"
				},
				"watercolor": {
					"url": 			"http://{S}tile.stamen.com/watercolor/{Z}/{X}/{Y}.jpg",
					"minZoom": 		3,
					"maxZoom": 		16,
					"attribution": 	"stamen"
				}
			}
		},

		googleplus: {

			get: function(m) {
				var api_key;
				var gplus = {user: m.user, activity: m.id, id: m.uid, thumb: thumb};

				taogiVMM.master_config.googleplus.que.push(gplus);
				taogiVMM.master_config.googleplus.active = true;
			},

			create: function(gplus, callback) {
				var mediaElem			= "",
					api_key				= "",
					g_activity			= "",
					g_content			= "",
					g_attachments		= "",
					gperson_api_url,
					gactivity_api_url;
					googleplus_timeout	= setTimeout(taogiVMM.ExternalAPI.googleplus.errorTimeOut, taogiVMM.master_config.timers.api, gplus),
					callback_timeout	= setTimeout(callback, taogiVMM.master_config.timers.api, gplus);

				if (taogiVMM.master_config.Timeline.api_keys.google != "") {
					api_key = taogiVMM.master_config.Timeline.api_keys.google;
				} else {
					api_key = Aes.Ctr.decrypt(taogiVMM.master_config.api_keys_master.google, taogiVMM.master_config.vp, 256);
				}

				gperson_api_url = "https://www.googleapis.com/plus/v1/people/" + gplus.user + "/activities/public?alt=json&maxResults=100&fields=items(id,url)&key=" + api_key;

				//mediaElem	=	"<iframe class='doc' frameborder='0' width='100%' height='100%' src='" + gplus.url + "&amp;embedded=true'></iframe>";
				mediaElem = "GOOGLE PLUS API CALL";

				taogiVMM.getJSON(gperson_api_url, function(p_data) {
					for(var i = 0; i < p_data.items.length; i++) {
						trace("loop");
						if (p_data.items[i].url.split("posts/")[1] == gplus.activity) {
							trace("FOUND IT!!");

							g_activity = p_data.items[i].id;
							gactivity_api_url = "https://www.googleapis.com/plus/v1/activities/" + g_activity + "?alt=json&key=" + api_key;

							taogiVMM.getJSON(gactivity_api_url, function(a_data) {
								trace(a_data);
								//a_data.url
								//a_data.image.url
								//a_data.actor.displayName
								//a_data.provider.title
								//a_data.object.content

								//g_content		+=	"<h4>" + a_data.title + "</h4>";

								if (typeof a_data.annotation != 'undefined') {
									g_content	+=	"<div class='googleplus-annotation'>'" + a_data.annotation + "</div>";
									g_content	+=	a_data.object.content;
								} else {
									g_content	+=	a_data.object.content;
								}

								if (typeof a_data.object.attachments != 'undefined') {

									//g_attachments	+=	"<div class='googleplus-attachemnts'>";
									for(var k = 0; k < a_data.object.attachments.length; k++) {
										if (a_data.object.attachments[k].objectType == "photo") {
											g_attachments	=	"<a href='" + a_data.object.url + "' target='_blank'>" + "<img src='" + a_data.object.attachments[k].image.url + "' class='article-thumb'></a>" + g_attachments;
										} else if (a_data.object.attachments[k].objectType == "video") {
											g_attachments	=	"<img src='" + a_data.object.attachments[k].image.url + "' class='article-thumb'>" + g_attachments;
											g_attachments	+=	"<div>";
											g_attachments	+=	"<a href='" + a_data.object.attachments[k].url + "' target='_blank'>"
											g_attachments	+=	"<h5>" + a_data.object.attachments[k].displayName + "</h5>";
											//g_attachments	+=	"<p>" + a_data.object.attachments[k].content + "</p>";
											g_attachments	+=	"</a>";
											g_attachments	+=	"</div>";
										} else if (a_data.object.attachments[k].objectType == "article") {
											g_attachments	+=	"<div>";
											g_attachments	+=	"<a href='" + a_data.object.attachments[k].url + "' target='_blank'>"
											g_attachments	+=	"<h5>" + a_data.object.attachments[k].displayName + "</h5>";
											g_attachments	+=	"<p>" + a_data.object.attachments[k].content + "</p>";
											g_attachments	+=	"</a>";
											g_attachments	+=	"</div>";
										}

										trace(a_data.object.attachments[k]);
									}

									g_attachments	=	"<div class='googleplus-attachments'>" + g_attachments + "</div>";
								}

								//mediaElem		=	"<div class='googleplus'>";
								mediaElem		=	"<div class='googleplus-content'>" + g_content + g_attachments + "</div>";

								mediaElem		+=	"<div class='vcard author'><a class='screen-name url' href='" + a_data.url + "' target='_blank'>";
								mediaElem		+=	"<span class='avatar'><img src='" + a_data.actor.image.url + "' style='max-width: 32px; max-height: 32px;'></span>"
								mediaElem		+=	"<span class='fn'>" + a_data.actor.displayName + "</span>";
								mediaElem		+=	"<span class='nickname'><span class='thumbnail-inline'></span></span>";
								mediaElem		+=	"</a></div><i></i>";

								taogiVMM.attachElement("#" + gplus.id, mediaElem);
							});

							break;
						}
					}
				})
				.error(function(jqXHR, textStatus, errorThrown) {
					var error_obj = taogiVMM.parseJSON(jqXHR.responseText);
					trace(error_obj.error.message);
					taogiVMM.attachElement("#" + gplus.id, loadingmessage("<p>ERROR LOADING GOOGLE+ </p><p>" + error_obj.error.message + "</p>"));
				})
				.success(function(d) {
					clearTimeout(googleplus_timeout);
					clearTimeout(callback_timeout);
					callback();
				});
			},

			resize: function(gplus) {
			},

			pushQue: function() {
				if (taogiVMM.master_config.googleplus.que.length > 0) {
					taogiVMM.ExternalAPI.googleplus.create(taogiVMM.master_config.googleplus.que[0], taogiVMM.ExternalAPI.googleplus.pushQue);
					taogiVMM.master_config.googleplus.que.remove(0);
				}
				/*
				for(var i = 0; i < taogiVMM.master_config.googleplus.que.length; i++) {
					taogiVMM.ExternalAPI.googleplus.create(taogiVMM.master_config.googleplus.que[i]);
				}
				taogiVMM.master_config.googleplus.que = [];
				*/
			},

			errorTimeOut: function(gplus) {
				trace("GOOGLE+ JSON ERROR TIMEOUT " + gplus.activity);
				taogiVMM.attachElement("#" + gplus.activity, loadingmessage("<p>Still waiting on GOOGLE+ </p><p>" + gplus.activity + "</p>"));
			}
		},

		googledocs: {

			get: function(m) {
				taogiVMM.master_config.googledocs.que.push(m);
				taogiVMM.master_config.googledocs.active = true;
			},

			create: function(doc) {
				var mediaElem = ""; 
				var e = taogiVMM.getElement('#'+doc.uid,true);
				if(e) {
					var d_width = taogiVMM.Lib.width(e);
					var d_height = taogiVMM.Lib.height(e);
				} else {
					var d_width = taogiVMM.master_config.Timeline.feature.width;
					var d_height = taogiVMM.master_config.Timeline.feature.height;
				}
				if (doc.id.match(/docs.google.com/i)) {
					mediaElem	=	"<iframe class='doc' frameborder='0' width='100%' height='100%' src='" + doc.id + "&amp;embedded=true'></iframe>";
				} else {
					mediaElem	=	"<iframe class='doc' frameborder='0' width='100%' height='100%' src='" + "//docs.google.com/viewer?url=" + doc.id + "&amp;embedded=true'></iframe>";
				}
				taogiVMM.attachElement("#"+doc.uid, mediaElem);
			},

			createThumb: function(doc) {
				var mediaElem = "<article class='document-thumb'><cite class='cite'>google</cite><div class='ext'>docs</div><h5 class='doc-title'>"+doc.caption+"</h5></article><i></i>";
				taogiVMM.attachElement("#"+doc.uid, mediaElem);
				taogiVMM.Lib.addClass("#"+doc.uid, 'noimage');
			},

			resize: function(doc) {
			},

			pushQue: function() {

				for(var i = 0; i < taogiVMM.master_config.googledocs.que.length; i++) {
					if(taogiVMM.master_config.googledocs.que[i].thumb)
						taogiVMM.ExternalAPI.googledocs.createThumb(taogiVMM.master_config.googledocs.que[i]);
					else
						taogiVMM.ExternalAPI.googledocs.create(taogiVMM.master_config.googledocs.que[i]);
				}
				taogiVMM.master_config.googledocs.que = [];
			}
		},

		flickr: {

			get: function(m) {
				taogiVMM.master_config.flickr.que.push(m);
				taogiVMM.master_config.flickr.active = true;
			},

			create: function(flick, callback) {
				var api_key,
					callback_timeout= setTimeout(callback, taogiVMM.master_config.timers.api, flick);

				if (taogiVMM.master_config.Timeline.api_keys.flickr != "") {
					api_key = taogiVMM.master_config.Timeline.api_keys.flickr;
				} else {
					api_key = Aes.Ctr.decrypt(taogiVMM.master_config.api_keys_master.flickr, taogiVMM.master_config.vp, 256)
				}
				var the_url = "http://api.flickr.com/services/rest/?method=flickr.photos.getSizes&api_key=" + api_key + "&photo_id=" + flick.id + "&format=json&jsoncallback=?";

				taogiVMM.getJSON(the_url, function(d) {
					var flickr_id = d.sizes.size[0].url.split("photos\/")[1].split("/")[1];

					var flickr_id = "#" + flick.uid;

					var flickr_img_size,
						flickr_size_found = false,
						flickr_best_size = "Large";
					if(flick.thumb) flickr_best_size = "Small";

					if(flick.thumb)
						flickr_best_size = taogiVMM.ExternalAPI.flickr.sizes(taogiVMM.master_config.Timeline.thumb.height);
					else
						flickr_best_size = taogiVMM.ExternalAPI.flickr.sizes(taogiVMM.master_config.Timeline.feature.height);

					for(var i = 0; i < d.sizes.size.length; i++) {
						if (d.sizes.size[i].label == flickr_best_size) {
							flickr_size_found = true;
							flickr_img_size = d.sizes.size[i].source;
						}
					}
					if (!flickr_size_found) {
						flickr_img_size = d.sizes.size[d.sizes.size.length - 1].source;
					}
					var imgclass="";
					if(flickr_img_size.match(/png|gif/i)) var imgclass="png";

					flickr_img_thumb = d.sizes.size[0].source;
					taogiVMM.Lib.html('#t_'+flick.uid, '<img src="'+flickr_img_thumb+'" />');
					taogiVMM.alignattachElement(flickr_id, "<img src='" + flickr_img_size + "' class='feature_image "+imgclass+"'>",flickr_id+(flick.thumb ? ' .feature_image' : ''),(flick.thumb ? 1 : 0));
					jQuery(flickr_id+' a').click(function(event) {
						event.preventDefault();
					});
				})
				.error(function(jqXHR, textStatus, errorThrown) {
					trace("FLICKR error");
					trace("FLICKR ERROR: " + textStatus + " " + jqXHR.responseText);
				})
				.success(function(d) {
					clearTimeout(callback_timeout);
					callback();
				});
			},

			resize: function(flick) {
				taogiVMM.Util.reAlignMiddle("#" + flick.uid+(flick.thumb ? ' .feature_image' : ''),(flick.thumb ? 1 : 0));
			},

			pushQue: function() {
				if (taogiVMM.master_config.flickr.que.length > 0) {
					taogiVMM.ExternalAPI.flickr.create(taogiVMM.master_config.flickr.que[0], taogiVMM.ExternalAPI.flickr.pushQue);
					taogiVMM.master_config.flickr.que.remove(0);
				}
			},

			sizes: function(s) {
				var _size = "";
				if (s <= 75) {
					_size = "Thumbnail";
				} else if (s <= 180) {
					_size = "Small";
				} else if (s <= 240) {
					_size = "Small 320";
				} else if (s <= 375) {
					_size = "Medium";
				} else if (s <= 480) {
					_size = "Medium 640";
				} else if (s <= 600) {
					_size = "Medium 800";
				} else {
					_size = "Large";
				}

				return _size;
			}
		},

		instagram: {
			get: function(m) {
				if (m.thumb) {
					return "http://instagr.am/p/" + m.id + "/media/?size=t";
				} else {
					return "http://instagr.am/p/" + m.id + "/media/?size=" + taogiVMM.ExternalAPI.instagram.sizes(taogiVMM.master_config.sizes.api.height);
				}
			},

			resize: function(m) {
			},

			sizes: function(s) {
				var _size = "";
				if (s <= 150) {
					_size = "t";
				} else if (s <= 306) {
					_size = "m";
				} else {
					_size = "l";
				}
				
				return _size;
			}
		},

		soundcloud: {

			get: function(m) {
				taogiVMM.master_config.soundcloud.que.push(m);
				taogiVMM.master_config.soundcloud.active = true;
			},

			create: function(sound, callback) {
				var the_url = "http://soundcloud.com/oembed?url=" + sound.id + (sound.auto === true ? "&auto_play=true" : "") + "&format=js&callback=?";
				taogiVMM.getJSON(the_url, function(d) {
					taogiVMM.alignattachElement("#"+sound.uid, d.html,'#'+sound.uid,0);
					callback();
				});
			},

			createThumb: function(sound, callback) {
				var the_url = "http://soundcloud.com/oembed?url=" + sound.id + "&format=js&callback=?";
				taogiVMM.getJSON(the_url, function(d) {
					taogiVMM.alignattachElement("#"+sound.uid, "<img src='" + d.thumbnail_url + "' class='feature_image' /><h5 class='soundcloud caption'>"+d.title+"</h5><i></i>",'#'+sound.uid+' .feature_image',1);
					callback();
				});
			},

			resize: function(sound) {
				taogiVMM.Util.reAlignMiddle('#'+sound.uid+(sound.thumb ? ' .feature_image' : ''),(sound.thumb ? 1 : 0));
			},

			pushQue: function() {
				if (taogiVMM.master_config.soundcloud.que.length > 0) {
					if(taogiVMM.master_config.soundcloud.que[0].thumb)
						taogiVMM.ExternalAPI.soundcloud.createThumb(taogiVMM.master_config.soundcloud.que[0], taogiVMM.ExternalAPI.soundcloud.pushQue);
					else
						taogiVMM.ExternalAPI.soundcloud.create(taogiVMM.master_config.soundcloud.que[0], taogiVMM.ExternalAPI.soundcloud.pushQue);
					taogiVMM.master_config.soundcloud.que.remove(0);
				}
			}
		},

		wikipedia: {

			get: function(m) {
				taogiVMM.master_config.wikipedia.que.push(m);
				taogiVMM.master_config.wikipedia.active = true;
			},

			create: function(api_obj, callback) {
				var the_url = "http://" + api_obj.lang + ".wikipedia.org/w/api.php?action=query&prop=extracts&redirects=&titles=" + api_obj.id + "&exintro=1&format=json&callback=?";
				callback_timeout= setTimeout(callback, taogiVMM.master_config.timers.api, api_obj);

				if ( taogiVMM.Browser.browser == "Explorer" && parseInt(taogiVMM.Browser.version, 10) >= 7 && window.XDomainRequest) {
					var temp_text	=	"<h4><a href='http://" + api_obj.lang + ".wikipedia.org/wiki/" + api_obj.id + "' target='_blank'>" + api_obj.url + "</a></h4>";
					temp_text		+=	"<span class='wiki-source'>From Wikipedia, the free encyclopedia</span>";
					temp_text		+=	"<p>Wikipedia entry unable to load using Internet Explorer 8 or below.</p>";
					taogiVMM.attachElement("#"+api_obj.uid, '<div class="blockquote"><p>'+temp_text+'</p></div><i></i>' );
				}

				taogiVMM.getJSON(the_url, function(d) {
					if (d.query) {
						var wiki_extract,
							wiki_title, 
							_wiki = "", 
							wiki_text = "", 
							wiki_number_of_paragraphs = 1, 
							wiki_text_array = [];

						wiki_extract = taogiVMM.Util.getObjectAttributeByIndex(d.query.pages, 0).extract;
						wiki_title = taogiVMM.Util.getObjectAttributeByIndex(d.query.pages, 0).title;

						if (wiki_extract.match("<p>")) {
							wiki_text_array = wiki_extract.split("<p>");
						} else {
							wiki_text_array.push(wiki_extract);
						}

						for(var i = 0; i < wiki_text_array.length; i++) {
							if (i+1 <= wiki_number_of_paragraphs && i+1 < wiki_text_array.length) {
								wiki_text	+= "<p>" + wiki_text_array[i+1];
							}
						}

						_wiki		=	"<h4><a href='http://" + api_obj.lang + ".wikipedia.org/wiki/" + wiki_title + "' target='_blank'>" + wiki_title + "</a></h4>";
						_wiki		+=	"<span class='wiki-source'>From Wikipedia, the free encyclopedia</span>";
						_wiki		+=	taogiVMM.Util.linkify_wikipedia(wiki_text);

						if (wiki_extract.match("REDIRECT")) {

						} else {
							if(api_obj.thumb) {
								taogiVMM.attachElement("#"+api_obj.uid, '<div class="blockquote">'+_wiki+'</div><i></i>' );
								taogiVMM.Lib.addClass('#'+api_obj.uid,'taogi_buildGallery');
							} else {
								taogiVMM.alignattachElement("#"+api_obj.uid, '<div class="blockquote">'+_wiki+'</div><i></i>', '#'+api_obj.uid,0);
							}
						}
					}
					//callback();
				})
				.error(function(jqXHR, textStatus, errorThrown) {
					trace("WIKIPEDIA error");
					trace("WIKIPEDIA ERROR: " + textStatus + " " + jqXHR.responseText);
					trace(errorThrown);

					taogiVMM.attachElement("#wikipedia_"+api_obj.uid, loadingmessage("<p>Wikipedia is not responding</p>"));
					// TRY AGAIN?
					clearTimeout(callback_timeout);
					if (taogiVMM.master_config.wikipedia.tries < 4) {
						trace("WIKIPEDIA ATTEMPT " + taogiVMM.master_config.wikipedia.tries);
						trace(api_obj);
						taogiVMM.master_config.wikipedia.tries++;
						taogiVMM.ExternalAPI.wikipedia.create(api_obj, callback);
					} else {
						callback();
					}
				})
				.success(function(d) {
					taogiVMM.master_config.wikipedia.tries = 0;
					clearTimeout(callback_timeout);
					callback();
				});
			},

			resize: function(api_obj) {
				if(!api_obj.thumb) {
					taogiVMM.Util.reAlignMiddle('#'+api_obj.uid,0);
				}
			},

			pushQue: function() {
				if (taogiVMM.master_config.wikipedia.que.length > 0) {
					trace("WIKIPEDIA PUSH QUE " + taogiVMM.master_config.wikipedia.que.length);
					taogiVMM.ExternalAPI.wikipedia.create(taogiVMM.master_config.wikipedia.que[0], taogiVMM.ExternalAPI.wikipedia.pushQue);
					taogiVMM.master_config.wikipedia.que.remove(0);
				}
			}
		},

		rigvedawiki: {
			get: function(m) {
				taogiVMM.master_config.rigvedawiki.que.push(m);
				taogiVMM.master_config.rigvedawiki.active = true;
			},

			create: function(api_obj, callback) {
				var the_url = "./library/api.php?type=rigvedawiki&taogiauth=ACA20D8B4F7B63D8639C7824AC458D3A53F7E275&url="+encodeURI("http://rigvedawiki.net/r1/wiki.php/" + api_obj.id + "?action=print");
				callback_timeout= setTimeout(callback, taogiVMM.master_config.timers.api, api_obj);

				taogiVMM.getJSON(the_url, function(d) {
					if (d) {
						var wiki_extract,
							wiki_title, 
							_wiki = "", 
							wiki_text = "", 
							wiki_number_of_paragraphs = 1, 
							wiki_text_array = [];

						wiki_extract = jQuery(d);
						wiki_title = api_obj.id;

						if(d.section)
							var _s = d.section
						else if(d.content)
							var _s = d.content

						_wiki		=	"<h4><a href='http://rigvedawiki.net/r1/wiki.php/" + wiki_title + "' target='_blank'>" + decodeURIComponent(wiki_title) + "</a></h4>";
						_wiki		+=	"<span class='wiki-source'>From rigvedawiki</span>";
						_wiki		+=	"<p>"+_s.substring(0,300)+"</p>";

						if(api_obj.thumb) {
							taogiVMM.attachElement("#"+api_obj.uid, '<div class="blockquote">'+_wiki+'</div><i></i>' );
							taogiVMM.Lib.addClass('#'+api_obj.uid,'taogi_buildGallery');
						} else
							taogiVMM.alignattachElement("#"+api_obj.uid, '<div class="blockquote">'+_wiki+'</div><i></i>','#'+api_obj.uid,0);
					}
				})
				.error(function(jqXHR, textStatus, errorThrown) {
					trace("RIGVEDAWIKI error");
					trace("RIGVEDAWIKI ERROR: " + textStatus + " " + jqXHR.responseText);
					trace(errorThrown);

					taogiVMM.attachElement("#"+api_obj.uid, loadingmessage("<p>Rigvedawiki is not responding</p>"));
					// TRY AGAIN?
					clearTimeout(callback_timeout);
					callback();
				})
				.success(function(d) {
					clearTimeout(callback_timeout);
					callback();
				});
			},

			resize: function(api_obj) {
				if(!api_obj.thumb) {
					taogiVMM.Util.reAlignMiddle('#'+api_obj.uid,0);
				}
			},

			pushQue: function() {
				if (taogiVMM.master_config.rigvedawiki.que.length > 0) {
					trace("WIKIPEDIA PUSH QUE " + taogiVMM.master_config.rigvedawiki.que.length);
					taogiVMM.ExternalAPI.rigvedawiki.create(taogiVMM.master_config.rigvedawiki.que[0], taogiVMM.ExternalAPI.rigvedawiki.pushQue);
					taogiVMM.master_config.rigvedawiki.que.remove(0);
				}
			}
		},

		youtube: {

			get: function(m) {
				taogiVMM.master_config.youtube.que.push(m);

				if (!taogiVMM.master_config.youtube.active) {
					if (!taogiVMM.master_config.youtube.api_loaded) {
						LoadLib.js('http://www.youtube.com/player_api', function() {
							trace("YouTube API Library Loaded");
						});
					}
				}

				// THUMBNAIL
				if(m.thumb > 1)
					taogiVMM.ExternalAPI.youtube.createThumb(m)
			},

			create: function(vid) {
				if (typeof(vid.start) != 'undefined') {

					var vidstart			= vid.start.toString(),
						vid_start_minutes	= 0,
						vid_start_seconds	= 0;

					if (vidstart.match('m')) {
						vidstart = vidstart.split("=")[1];
						vid_start_minutes = parseInt(vidstart.split("m")[0], 10);
						vid_start_seconds = parseInt(vidstart.split("m")[1].split("s")[0], 10);
						vid.start = (vid_start_minutes * 60) + vid_start_seconds;
					} else {
						vid.start = 0;
					}
				} else {
					vid.start = 0;
				}

				var p = {
					active: 				false,
					player: 				{},
					name:					vid.uid,
					playing:				false
				};

				if (typeof(vid.hd) != 'undefined') {
					p.hd = true;
				}

				var e = taogiVMM.getElement('#'+vid.uid,true);
				if(vid.width > 0 && vid.height > 0) {
					var y_width = vid.width;
					var y_height = vid.height;
				} else if(e) {
					var y_width = taogiVMM.Lib.width(e);
					var y_height = taogiVMM.Lib.height(e);
					var y_max_width = Math.round((y_height * 16 / 9));
					y_width = (y_width > y_max_width) ? y_max_width : y_width;
				} else {
					var y_width = taogiVMM.master_config.Timeline.feature.width;
					var y_height = taogiVMM.master_config.Timeline.feature.height;
				}
				p.player[vid.id] = new YT.Player(vid.uid+'_youtube', {
					height: 				y_height,
					width: 					y_width,
					playerVars: {
						enablejsapi:		1,
						wmode:				(vid.wmode == 'transparent' ? 'transparent' : ''),
						color: 				'white',
						showinfo:			1,
						theme:				'light',
						start:				vid.start,
						autoplay:			(vid.auto ? 1 : 0),
						rel:				0
					},
					videoId: vid.id,
					events: {
						'onReady': 			taogiVMM.ExternalAPI.youtube.onPlayerReady,
						'onStateChange': 	taogiVMM.ExternalAPI.youtube.onStateChange
					}
				});

				taogiVMM.master_config.youtube.array.push(p);
			},

			createThumb: function(vid) {
				trace("CREATE YouTube THUMB: "+vid.id);
				var the_url = "http://gdata.youtube.com/feeds/api/videos/" + vid.id + "?v=2&alt=jsonc&callback=?";
				taogiVMM.getJSON(the_url, function(d) {
					if (typeof d.data != 'undefined') {
						taogiVMM.alignattachElement('#'+vid.uid, "<img src='" + d.data.thumbnail.sqDefault + "' class='feature_image'><h5 class='youtube caption'>"+d.data.title+"</h5><i></i>", '#'+vid.uid+" .feature_image", 1);
					}
				});
			},

			resize: function(vid) {
				if(vid.thumb) {
					taogiVMM.Util.reAlignMiddle('#'+vid.uid+' .feature_image',1);
				}
			},

			pushQue: function() {
				for(var i = 0; i < taogiVMM.master_config.youtube.que.length; i++) {
					if(taogiVMM.master_config.youtube.que[i].thumb)
						taogiVMM.ExternalAPI.youtube.createThumb(taogiVMM.master_config.youtube.que[i]);
					else
						taogiVMM.ExternalAPI.youtube.create(taogiVMM.master_config.youtube.que[i]);
				}
				taogiVMM.master_config.youtube.que = [];
			},

			onAPIReady: function() {
				taogiVMM.master_config.youtube.active = true;
				taogiVMM.master_config.youtube.api_loaded = true;
				taogiVMM.ExternalAPI.youtube.pushQue();
			},

			stopPlayers: function() {
				for(var i = 0; i < taogiVMM.master_config.youtube.array.length; i++) {
					if (taogiVMM.master_config.youtube.array[i].playing) {
						var the_name = taogiVMM.master_config.youtube.array[i].name;
						taogiVMM.master_config.youtube.array[i].player[the_name].stopVideo();
					}
				}
			},

			onStateChange: function(e) {
				for(var i = 0; i < taogiVMM.master_config.youtube.array.length; i++) {
					var the_name = taogiVMM.master_config.youtube.array[i].name;
					if (taogiVMM.master_config.youtube.array[i].player[the_name] == e.target) {
						if (e.data == YT.PlayerState.PLAYING) {
							taogiVMM.master_config.youtube.array[i].playing = true;
							if (taogiVMM.master_config.youtube.array[i].hd) {
							}
						}
					}
				}
			},

			onPlayerReady: function(e) {
			}
		},

		vimeo: {

			get: function(m) {
				taogiVMM.master_config.vimeo.que.push(m);
				taogiVMM.master_config.vimeo.active = true;
			},

			create: function(m, callback) {
				trace("VIMEO CREATE");
				var video_url   = "http://player.vimeo.com/video/" + m.id + "?title=0&amp;byline=0&amp;portrait=0&amp;color=ffffff";
				if(m.auto)
					video_url += "&amp;autoplay=1";

				// VIDEO
				var e = taogiVMM.getElement('#'+m.uid,true);
				if(m.width > 0 && m.height > 0) {
					var v_width = m.width;
					var v_height = m.height;
				} else if(e) {
					var v_width = taogiVMM.Lib.width(e);
					var v_height = taogiVMM.Lib.height(e);
					var v_max_width = Math.round((v_height * 16 / 9));
					v_width = (v_width > v_max_width) ? v_max_width : v_width;
				} else {
					var v_width = taogiVMM.master_config.Timeline.feature.width;
					var v_height = taogiVMM.master_config.Timeline.feature.height;
				}
				taogiVMM.attachElement("#" + m.uid, "<iframe autoplay='"+(m.auto ? 1 : 0)+"' frameborder='0' width='"+v_width+"' height='"+v_height+"' src='" + video_url + "' webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>");
				taogiVMM.master_config.vimeo.que.remove(0);
				callback();
			},

			createThumb: function(m,callback) {
				trace("VIMEO CREATE THUMB "+m.thumbnail);
				if(m.thumbnail) {
					taogiVMM.alignattachElement('#'+m.uid, "<img src='" + m.thumbnail + "' class='feature_image'><h5 class='vimeo caption'>"+m.caption+"</h5><i></i>", '#'+m.uid+" .feature_image", 1);
					taogiVMM.master_config.vimeo.que.remove(0);
					callback();
				} else {
					var the_url = "http://vimeo.com/api/v2/video/" + m.id + ".json?callback=?";
					taogiVMM.getJSON(the_url, function(d) {
						var thumb_id = "#" + m.uid;
						taogiVMM.alignattachElement('#'+m.uid, "<img src='" + d[0].thumbnail_small + "' class='feature_image' /><h5 class='vimeo caption'>"+d[0].title+"</h5><i></i>",'#'+m.uid+' .feature_image',1);
						taogiVMM.master_config.vimeo.que.remove(0);
						callback();
					});
				}
			},

			resize: function(m) {
				if(m.thumb) {
					taogiVMM.Util.reAlignMiddle('#'+m.uid+' .feature_image',1);
				}
			},

			pushQue: function() {
				if (taogiVMM.master_config.vimeo.que.length > 0) {
					if(taogiVMM.master_config.vimeo.que[0].thumb)
						taogiVMM.ExternalAPI.vimeo.createThumb(taogiVMM.master_config.vimeo.que[0], taogiVMM.ExternalAPI.vimeo.pushQue);
					else
						taogiVMM.ExternalAPI.vimeo.create(taogiVMM.master_config.vimeo.que[0], taogiVMM.ExternalAPI.vimeo.pushQue);
				}
			}
		},

		dailymotion: {

			get: function(m) {
				taogiVMM.master_config.dailymotion.que.push(m);
				taogiVMM.master_config.dailymotion.active = true;
			},

			create: function(m, callback) {
				trace("DAILYMOTION CREATE");
				var thumb_id = "#" + m.uid;
				var e = taogiVMM.getElement('#'+m.uid,true);
				if(e) {
					var d_width = taogiVMM.Lib.width(e);
					var d_height = taogiVMM.Lib.height(e);
				} else {
					var d_width = taogiVMM.master_config.Timeline.feature.width;
					var d_height = taogiVMM.master_config.Timeline.feature.height;
				}
				taogiVMM.attachElement(thumb_id, "<iframe class='dailymotion' frameborder='0' width='"+d_width+"' height='"+d_height+"' src='http://www.dailymotion.com/embed/video/" + m.id + (m.auto ? '?autoplay=1' : '') + "'></iframe>");
			},

			createThumb: function(m) {
				trace("DAILYMOTION CREATE THUMB");
				var the_url = "http://www.dailymotion.com/services/oembed?format=json&url=" + m.url+"&callback=?";
				taogiVMM.getJSON(the_url, function(d) {
					var thumb_id = "#" + m.uid;
					taogiVMM.alignattachElement(thumb_id, "<img src='" + d.thumbnail_url + "' class='feature_image' /><h5 class='dailymotion caption'>"+d.title+"</h5><i></i>",thumb_id+' .feature_image',1);
				});
			},

			resize: function(m) {
				if(m.thumb) {
					taogiVMM.Util.reAlignMiddle('#'+m.uid+' .feature_image',1);
				}
			},

			pushQue: function() {
				if (taogiVMM.master_config.dailymotion.que.length > 0) {
					if(taogiVMM.master_config.dailymotion.que[0].thumb)
						taogiVMM.ExternalAPI.dailymotion.createThumb(taogiVMM.master_config.dailymotion.que[0], taogiVMM.ExternalAPI.dailymotion.pushQue);
					else
						taogiVMM.ExternalAPI.dailymotion.create(taogiVMM.master_config.dailymotion.que[0], taogiVMM.ExternalAPI.dailymotion.pushQue);
					taogiVMM.master_config.dailymotion.que.remove(0);
				}
			}
		},

		vine: {

			get: function(m) {
				taogiVMM.master_config.vine.que.push(m);
				taogiVMM.master_config.vine.active = true;
			},

			create: function(m, callback) {
				trace("VINE CREATE");

				var video_url   = "https://vine.co/v/" + m.id + "/embed/simple";

				// VIDEO
				// TODO: NEED TO ADD ASYNC SCRIPT TO TIMELINE FLOW
				taogiVMM.attachElement("#" + m.uid, "<iframe frameborder='0' width='100%' height='100%' src='" + video_url + "'></iframe><script async src='http://platform.vine.co/static/scripts/embed.js' charset='utf-8'></script>");

			},

			createThumb: function(m) {
				var mediaElem = "<article class='vine-thumb'><cite class='cite'>vine</cite><div class='vine'>vine</div><h5 class='vine-title'>"+m.caption+"</h5></article><i></i>";
				taogiVMM.attachElement("#"+m.uid, mediaElem);
				taogiVMM.Lib.addClass("#"+m.uid, 'noimage');
			},

			resize: function(m) {
			},

			pushQue: function() {
				if (taogiVMM.master_config.vine.que.length > 0) {
					if(taogiVMM.master_config.vine.que[0].thumb)
						taogiVMM.ExternalAPI.vine.createThumb(taogiVMM.master_config.vine.que[0], taogiVMM.ExternalAPI.vine.pushQue);			
					else
						taogiVMM.ExternalAPI.vine.create(taogiVMM.master_config.vine.que[0], taogiVMM.ExternalAPI.vine.pushQue);			
					taogiVMM.master_config.vine.que.remove(0);
				}
			}

		},

		mediaelements: {

			get: function(m) {
				taogiVMM.master_config.mediaelements.que.push(m);

				if (!taogiVMM.master_config.mediaelements.active) {
					if (!taogiVMM.master_config.mediaelements.api_loaded) {
						LoadLib.js('./resources/mediaelement/mediaelement-and-player.min.js', function() {
							trace("MediaElement API Library Loaded");
							LoadLib.css('./resources/mediaelement/mediaelementplayer.css',function() {
								trace("MediaElement CSS Library Loaded");
								taogiVMM.master_config.mediaelements.api_loaded = true;
								taogiVMM.ExternalAPI.mediaelements.onAPIReady();
							});
						});
					}
				}
			},

			create: function(m) {
				taogiVMM.Lib.cssmultiple('#'+m.uid,{'width':'100%', 'height':'100%'});
				var ext = taogiVMM.Util.getExtension(m.id);
				if(m.use_proxy) {
					m.id = './library/api.php?type=proxy&taogiauth=ACA20D8B4F7B63D8639C7824AC458D3A53F7E275&skip_referer=1&url='+encodeURIComponent(m.id);
				}
				taogiVMM.attachElement("#" + m.uid, '<video id="'+m.uid+'_video" src="'+m.id+'" width="100%" height="100%"></video>');
				if(m.auto) {
					var mediaElementPlayer = new MediaElementPlayer('#'+m.uid+'_video',{
						videoWidth: taogiVMM.Lib.width('#'+m.uid),
						videoHeight: taogiVMM.Lib.height('#'+m.uid),
						success: function (mediaElement, domObject) {
							mediaElement.play();
						}
					});
				} else {
					var mediaElementPlayer = new MediaElementPlayer('#'+m.uid+'_video',{
						videoWidth: taogiVMM.Lib.width('#'+m.uid),
						videoHeight: taogiVMM.Lib.height('#'+m.uid)
					});
				}
				taogiVMM.Lib.addClass('#t_'+m.uid,ext);
			},

			createThumb: function(m) {
				var ext = taogiVMM.Util.getExtension(m.id);
				var mediaElem = "<article class='mediaelements-thumb'><cite class='cite'>"+ext+"</cite><div class='mediaelements'>"+ext+"</div><h5 class='mediaelements-title'>"+m.caption+"</h5></article><i></i>";
				taogiVMM.attachElement("#"+m.uid, mediaElem);
				taogiVMM.Lib.addClass('#'+m.uid, 'noimage taogi_buildGallery');
			},

			onAPIReady: function() {
				if (!taogiVMM.master_config.mediaelements.active) {
					taogiVMM.master_config.mediaelements.active = true;
					taogiVMM.ExternalAPI.mediaelements.pushQue();
				}
			},
			
			resize: function(m) {
			},

			pushQue: function() {
				for(var i = 0; i < taogiVMM.master_config.mediaelements.que.length; i++) {
					if(taogiVMM.master_config.mediaelements.que[i].thumb) {
						taogiVMM.ExternalAPI.mediaelements.createThumb(taogiVMM.master_config.mediaelements.que[i]);
						taogiVMM.master_config.mediaelements.que[i].active = true;
					} else {
						if(taogiVMM.master_config.mediaelements.active && !taogiVMM.master_config.mediaelements.que[i].active) {
							taogiVMM.ExternalAPI.mediaelements.create(taogiVMM.master_config.mediaelements.que[i]);
							taogiVMM.master_config.mediaelements.que[i].active = true;
						}
					}
				}
			}
		},

		pdf: {
			get: function(m) {
				taogiVMM.master_config.pdf.que.push(m);
				if (!taogiVMM.master_config.pdf.active) {
					if (!taogiVMM.master_config.pdf.api_loaded) {
						LoadLib.js('./resources/pdfobject/pdfobject.js', function() {
							trace("PDF OBJECT API Library Loaded");
							taogiVMM.master_config.pdf.api_loaded = true;
							taogiVMM.ExternalAPI.pdf.onAPIReady();
						});
					}
				}
			},

			create: function(m) {
				trace('create PDF');
				var mediaElem = '<div class="pdf-wrapper" id="pdf-wrapper-'+m.uid+'"></div>';
				var url = ((taogiVMM.Browser.browser == 'Explorer' && parseInt(taogiVMM.Browser.version, 10) <= 9) ? './library/api.php?type=proxy&taogiauth=ACA20D8B4F7B63D8639C7824AC458D3A53F7E275&url='+encodeURIComponent(m.id) : m.id);
				taogiVMM.attachElement("#" + m.uid, jQuery(mediaElem));
				var articlePDF = new PDFObject({
					url: url
				}).embed('pdf-wrapper-'+m.uid);
			},

			createThumb: function(m) {
				if(m.thumbnail) {
					var imgclass = '';
					if(m.thumbnail.match(/png|gif/i)) imgclass='png';
					taogiVMM.Util.attachThumbnail("#" + m.uid, m.thumbnail,'', '');
					taogiVMM.Lib.addClass('#'+m.uid, 'taogi_buildGallery pdf');
				} else {
					var mediaElem = '<article class="pdf-thumb"><cite class="cite">pdf</cite><div class="mediaelements">'+taogiVMM.Util.basename(m.id)+'</div><h5 class="pdf-title">'+(m.caption ? m.caption : m.credit)+'</h5></article><i></i>';
					taogiVMM.attachElement('#'+m.uid, mediaElem);
					taogiVMM.Lib.addClass('#'+m.uid, 'taogi_buildGallery pdf noimage');
				}
			},

			resize: function(m) {
				if(m.thumb && m.thumbnail) {
					taogiVMM.Util.reAlignMiddle('#'+m.uid+' .feature_image',1);
				}
			},

			onAPIReady: function() {
				if (!taogiVMM.master_config.pdf.active) {
					taogiVMM.master_config.pdf.active = true;
					taogiVMM.ExternalAPI.pdf.pushQue();
				}
			},

			pushQue: function() {
				if(taogiVMM.master_config.pdf.active == true && taogiVMM.master_config.pdf.api_loaded == true) {
					for(var i = 0; i < taogiVMM.master_config.pdf.que.length; i++) {
						if(taogiVMM.master_config.pdf.que[i].thumb) {
							taogiVMM.ExternalAPI.pdf.createThumb(taogiVMM.master_config.pdf.que[i]);
						} else {
							taogiVMM.ExternalAPI.pdf.create(taogiVMM.master_config.pdf.que[i]);
						}
					}
					taogiVMM.master_config.pdf.que = [];
				}
			}
		},

		iframe: {
			get: function(m) {
				taogiVMM.master_config.iframe.que.push(m);
				taogiVMM.master_config.iframe.active = true;
			},

			create: function(m) {
				trace("create IFRAME");
				var isIFrame = false;
				if(m.wmode == 'transparent') {
					if(m.url.match(/iframe/i)) {
						/* if this is naver player, then replace iframe into object */
						if(m.id.match(/serviceapi\.nmv\.naver\.com/)) {
							var grp = m.url.match(/width=['"]([^'"]+)['"]/gi);
							var w = grp[0];
							var grp = m.url.match(/height=['"]([^'"]+)['"]/gi);
							var h = grp[0];
							var vars = m.id.split('?')[1];
							m.url = "<object classid='clsid:d27cdb6e-ae6d-11cf-96b8-444553540000' codebase='http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=10,0,0,0' "+w+" "+h+" id='NFPlayer09474' align='middle'><param name='allowScriptAccess' value='always' /><param name='allowFullScreen' value='true' /><param name='movie' value='http://serviceapi.nmv.naver.com/flash/NFPlayer.swf?"+vars+"&wmode=transparent' /><param name='wmode' value='transparent' />"+(m.auto ? "<param name='autoplay' value='1' />" : "")+"<embed src='http://serviceapi.nmv.naver.com/flash/NFPlayer.swf?"+vars+"&wmode=transparent' wmode='transparent' "+w+" "+h+" allowScriptAccess='always' name='NFPlayer09474' allowFullScreen='true' type='application/x-shockwave-flash' "+(m.auto ? "autostart='true' " : "")+"/></object>";
						} else {
							trace("add wmode=transparent to iframe src");
							m.url = m.url.replace(/src=['"]([^'"]+)['"]/gi,"src='"+m.id+(m.id.match(/\?/) ? "&" : "?")+"wmode=transparent&html5=1"+(m.auto ? "&autoplay=1" : "")+"'");
							isIFrame = true;
						}
					} else if(m.url.match(/object/i)) {
						trace("change wmode param into transparent at object");
						var ifr = jQuery(m.url);
						if(ifr.find("param[name='wmode']").length)
							ifr.find("param[name='wmode']").val('transparent');
						else
							ifr.append(jQuery("<param name='wmode' value='transparent'>"));
						if(ifr.find("param[name='flashvars']").length) {
							var v = ifr.find("param[name='flashvars']").val();
							if(v.match(/wmode=/)) {
								v.replace(/wmode=([^&]+)/,'wmode=transparent');
							} else {
								v = (v ? v+"&" : '')+'wmode=transparent';
							}
							ifr.find("param[name='flashvars']").val(v);
						}
						var s = ifr.find('embed').attr('src');
						if(!s) s = ifr.find("param[name='movie']").val();
						if(s.match(/v\.nate.com\/v\.sk\/movie/) && taogiVMM.Browser.browser == 'Chrome') {
							var nate_s = s.split('/');
							s = "http://v.nate.com/player2/MoviePlayerEx.swf?vs_id=movie&vs_keys="+nate_s[nate_s.length-2].replace('|','%7C')+"&mov_id="+nate_s[nate_s.length-1];
						}
						if(s.match(/wmode=/)) {
							s = s.replace(/wmode=([^&]+)/,'wmode=transparent');
						} else {
							if(s.match(/\?/)) s += "&wmode=transparent";
							else s+= "?wmode=transparent";
						}
						ifr.find('embed').attr('src',s).attr('wmode','transparent');
						if(m.auto) {
							if(ifr.find("param[name='autoplay']").length) {
								ifr.find("param[name='autoplay']").val('true');
							} else {
								ifr.append(jQuery("<param name='autoplay' value='true'>"));
							}
							ifr.find('embed').attr('autostart','true');
						}
						ifr.find("param[name='movie']").val(s);
						m.url = ifr.get(0).outerHTML;
					} else if(m.url.match(/embed/i)) {
						trace("change wmode param into transparent at embed tag");
						if(m.auto) {
							if(m.url.match(/autostart=['"]/)) {
								m.url = m.url.replace(/autostart=['"]([^'"]+)['"]/,"autoplay='1'");
							} else {
								m.url = m.url.replace(/<embed/,"<embed autoplay='1'");
							}
						}
						if(m.url.match(/wmode=['"]/)) {
							m.url = m.url.replace(/wmode=['"]([^'"]+)['"]/,"wmode='transparent'");
						} else {
							m.url = m.url.replace(/<embed/,"<embed wmode='transparent'");
						}
						m.url = m.url.replace(/src=['"]([^'"]+)['"]/gi,"src='"+m.id+(m.id.match(/\?/) ? "&" : "?")+"wmode=transparent&html5=1"+(m.auto ? "&autoplay=1" : "")+"'");
					}
				}
				var mediaElem = "<div class='media-shadow noSwipe'>"+m.url+"</div>";
				taogiVMM.alignattachElement('#'+m.uid, mediaElem, '#'+m.uid, 0);
				jQuery('#'+m.uid).addClass("iframe");
				if(isIFrame == true) {
					var ic = jQuery('#'+m.uid).find('.media-shadow iframe').contents().find('body');
					if(ic.find('object, embed').length > 0) {
						trace('iframe has object or embed');
						ic.on("touchmove", false);
					} else if(ic.find('video').length > 0) {
						trace('iframe has html5 video');
						ic.on("touchmove", false);
					}
				} else {
					jQuery('#'+m.uid).find('.media-shadow').on("touchmove", false);
				}
			},

			createThumb: function(m) {
				trace("create IFRAME thumb");
				if(m.thumbnail) {
					taogiVMM.Util.attachThumbnail('#'+m.uid,m.thumbnail,'','');
				} else {
					var mediaElem = '<article class="iframe-thumb"><h5 class="iframe-title">'+(m.caption ? m.caption : m.credit)+'</h5></article><i></i>';
					taogiVMM.attachElement('#'+m.uid, mediaElem);
					taogiVMM.Lib.addClass('#'+m.uid, 'noimage');
				}
				jQuery('#'+m.uid).addClass('thumb-iframe taogi_buildGallery');
			},

			resize: function(m) {
				if(m.thumb && m.thumbnail) {
					taogiVMM.Util.reAlignMiddle('#'+m.uid+' .feature_image',1);
				} else if(!m.thumb) {
					taogiVMM.Util.reAlignMiddle('#'+m.uid,0);
				}
			},

			pushQue: function() {
				for(var i = 0; i < taogiVMM.master_config.iframe.que.length; i++) {
					if(taogiVMM.master_config.iframe.que[i].thumb)
						taogiVMM.ExternalAPI.iframe.createThumb(taogiVMM.master_config.iframe.que[i]);
					else
						taogiVMM.ExternalAPI.iframe.create(taogiVMM.master_config.iframe.que[i]);
				}
				taogiVMM.master_config.iframe.que = [];
			}
		},

		webthumb: {
			
			get: function(m) {
				taogiVMM.master_config.webthumb.que.push(m);
				taogiVMM.master_config.webthumb.active = true;
			},

			sizes: function(s) {
				var _size = "";
				if (s <= 150) {
					_size = "t";
				} else if (s <= 306) {
					_size = "m";
				} else {
					_size = "l";
				}

				return _size;
			},
				
			create: function(m) {
				var self = this;
				trace("WEB THUMB CREATE");
				//http://pagepeeker.com/t/{size}/{url}
				//http://api.snapito.com/free/lc?url=

				var imgclass = '';

				if(m.thumb && m.thumbnail) {
					taogiVMM.Util.attachThumbnail("#" + m.uid,m.thumbnail,'','');
					return;
				}
					
				var e = taogiVMM.getElement('#'+m.uid);

				var the_url = "./library/api.php?type=og&taogiauth=ACA20D8B4F7B63D8639C7824AC458D3A53F7E275&url="+encodeURIComponent(m.id);
				var og_support = false;
				var og = {};
				taogiVMM.getJSON(the_url,function(d) {
					if(d) {
						og_support = true;
						var imgclass = '';
						if(m.thumb) {
							if(d.image) {
								taogiVMM.Util.attachThumbnail("#"+m.uid, d.image, '','');
							} else {
								var _text = "";
								_text		=	'<h4><a href="' + m.id + '" target="_blank">' + d.title + "</a></h4>";
								_text		+=	"<span class='web-source'>BY "+d.name+"</span>";
								_text		+=	"<p>"+d.description.substring(0,300)+"</p>";
								taogiVMM.attachElement("#"+m.uid, '<div class="blockquote">'+_text+'</div><i></i>');
								taogiVMM.Lib.addClass('#'+m.uid,'noimage');
							}
							taogiVMM.Lib.addClass('#'+m.uid,'og taogi_buildGallery');
						} else {
							var _text = "";
							if(m.thumbnail) {
								if(m.thumbnail.match(/png|gif/i)) imgclass='png';
								_text	= "<a href='" + m.id + "' class='snapshot' target='_blank'><img src='" + m.thumbnail + "' class='feature_image "+imgclass+"'></a>";
							} else if(d.image) {
								if(d.image.match(/png|gif/i)) imgclass='png';
								_text	= "<a href='" + m.id + "' class='snapshot' target='_blank'><img src='" + d.image + "' class='feature_image "+imgclass+"'></a>";
							}
							_text		+=	'<h4 class="headline"><a href="' + m.id + '" target="_blank">' + d.title + "</a></h4>";
							_text		+=	"<div class='source'>BY "+d.name+"</div>";
							_text		+=	"<p class='summary'>"+d.description.substring(0,300)+"<span class='more'><span class='ellipsis'>... </span><a href='"+m.id+"' class='link' target='_blank'>"+taogiVMM.languagePack.read_source+"</a></span></p>";
							if( typeof( jQuery ) != 'undefined' ) {
								jQuery("#"+m.uid).html('<div class="blockquote">'+_text+'</div><i></i>').promise().done(function() {
									taogiVMM.Util.verifyImg('#'+m.uid+' img.feature_image','#'+m.uid,1);
								});
							}
							taogiVMM.Lib.addClass('#'+m.uid,'og taogi_buildGallery');
						}
					} else {
						if(m.thumbnail) {
							if(m.thumbnail.match(/png|gif/i)) imgclass='png';
							if(m.thumb) {
								taogiVMM.Util.attachThumbnail("#" + m.uid, m.thumbnail, m.id, '');
							} else {
								taogiVMM.alignattachElement("#" + m.uid, "<div class='blockquote'><a href='" + m.id + "' class='snapshot' target='_blank'><img src='" + m.thumbnail + "' class='feature_image "+imgclass+"'></a><a class='url' href='" + m.id + "' target='_blank'>"+m.id.substring(0,50)+"...</a></div>","#" + m.uid,0);
							}
						} else {
							taogiVMM.ExternalAPI.webthumb.pagepeeker(m);
						}
					}
				})
				.error(function(jqXHR, textStatus, errorThrown) {
					trace("error? :"+the_url);
					if(m.thumbnail) {
						if(m.thumbnail.match(/png|gif/i)) imgclass='png';
						if(m.thumb) {
							taogiVMM.alignattachElement("#" + m.uid, "<a href='" + m.id + "' class='snapshot' target='_blank'><img src='" + m.thumbnail + "' class='feature_image "+imgclass+"'><i></i></a>","#" + m.uid + (m.thumb ? ' .feature_image' : ''),(m.thumb ? 1 : 0));
						} else {
							taogiVMM.alignattachElement("#" + m.uid, "<div class='blockquote'><a href='" + m.id + "' class='snapshot' target='_blank'><img src='" + m.thumbnail + "' class='feature_image "+imgclass+"'></a><a class='url' href='" + m.id + "' target='_blank'>"+m.id.substring(0,50)+"...</a></div>","#" + m.uid + (m.thumb ? ' .feature_image' : ''),(m.thumb ? 1 : 0));
						}
					} else {
						taogiVMM.ExternalAPI.webthumb.pagepeeker(m);
					}
				});
			},

			resize: function(m) {
				if(jQuery('#'+m.uid).find('.blockquote').length > 0) {
					taogiVMM.Util.reAlignMiddle('#'+m.uid,(m.thumb ? 1 : 0));
				} else {
					taogiVMM.Util.reAlignMiddle('#'+m.uid+' .feature_image',(m.thumb ? 1 : 0));
				}
			},

			pagepeeker: function(m) {
				var e = taogiVMM.getElement('#'+m.uid);
				if(e) {
					var thumb_width = taogiVMM.Lib.width(e);
				}
				if (thumb_width) {
					var s = taogiVMM.ExternalAPI.webthumb.sizes(thumb_width);
				} else {
					var s = 't';
				}
				var url				= m.id.replace("http://", "");//.split("/")[0];
				if(m.thumbnail) {
					var thumb_url	= m.thumbnail;
				} else {
					var thumb_url	= "http://pagepeeker.com/t/x/"+url;
				}

				// Main Image
				if(m.thumb) {
					taogiVMM.alignattachElement("#" + m.uid, "<a href='" + m.id + "' target='_blank' class='snapshot'><img src='" + thumb_url + "' class='feature_image'><i></i></a>","#" + m.uid  + (m.thumb ? ' .feature_image' : ''),0);
				} else {
					taogiVMM.alignattachElement("#" + m.uid, "<div class='blockquote'><a href='" + m.id + "' target='_blank' class='snapshot'><img src='" + thumb_url + "' class='feature_image'></a><a class='url' href='" + m.id + "' target='_blank'>"+m.id.substring(0,50)+"...</a></div>","#" + m.uid  + (m.thumb ? ' .feature_image' : ''),0);
				}
			},

			pushQue: function() {
				for(var i = 0; i < taogiVMM.master_config.webthumb.que.length; i++) {
					taogiVMM.ExternalAPI.webthumb.create(taogiVMM.master_config.webthumb.que[i]);
				}
				taogiVMM.master_config.webthumb.que = [];
			}
		},

		attachment: {
			create: function(m) {
				var mediaElem= '';
				var ext = taogiVMM.Util.getExtension(m.id);
				if(m.thumb) {
					if(m.thumbnail) {
						taogiVMM.attachThumbnail("#" + m.uid, m.thumbnail,'','');
					} else {
						mediaElem = '<article class="attachment'+(m.thumb ? '-thumb' : '')+'><cite class="cite">'+ext+'</cite><div class="attachment">'+taogiVMM.Util.basename(m.id)+'</div><h5 class="attachment-title">'+(m.caption ? m.caption : m.credit)+'</h5></article><i></i>';
						taogiVMM.attachElement('#'+m.uid,mediaElem);
						taogiVMM.Lib.addClass('#'+m.uid, ext+' noimage taogi_buildGallery');
					}
				} else {
					var imgclass = 'noimage';
					mediaElem = '<div class="blockquote">';
					if(m.thumbnail) {
						mediaElem += '<a href="'+m.id+'" class="snapshot" target="_blank"><img src="'+m.thumbnail+'" class="feature_image" /></a>';
						var imgclass = '';
					}
					mediaElem += '<h4 class="headline"><a href="'+m.id+'" target="_blank">'+taogiVMM.languagePack.download.replace(/%s/,taogiVMM.Util.basename(m.id))+'</a></h4><p class="source">'+m.credit+'</p><p class="summary">'+m.caption+'</p></div>';
					taogiVMM.alignattachElement("#" + m.uid, mediaElem, "#" + m.uid,0);
					taogiVMM.Lib.addClass('#'+m.uid, ext+' '+imgclass);
				}
			},

			resize:function(m) {
				if(!m.thumb) taogiVMM.Util.reAlignMiddle('#'+m.uid,0);
			}
		}
	}).init();
}

/*  YOUTUBE API READY
	Can't find a way to customize this callback and keep it in the taogiVMM namespace
	Youtube wants it to be this function. 
================================================== */
function onYouTubePlayerAPIReady() {
	trace("GLOBAL YOUTUBE API CALLED")
	taogiVMM.ExternalAPI.youtube.onAPIReady();
}

/*
* touchSwipe - jQuery Plugin
* https://github.com/mattbryson/TouchSwipe-Jquery-Plugin
* http://labs.skinkers.com/touchSwipe/
* http://plugins.jquery.com/project/touchSwipe
*
* Copyright (c) 2010 Matt Bryson (www.skinkers.com)
* Dual licensed under the MIT or GPL Version 2 licenses.
*
* $version: 1.5.1
*
* Changelog
* $Date: 2010-12-12 (Wed, 12 Dec 2010) $
* $version: 1.0.0 
* $version: 1.0.1 - removed multibyte comments
*
* $Date: 2011-21-02 (Mon, 21 Feb 2011) $
* $version: 1.1.0 	- added allowPageScroll property to allow swiping and scrolling of page
*					- changed handler signatures so one handler can be used for multiple events
* $Date: 2011-23-02 (Wed, 23 Feb 2011) $
* $version: 1.2.0 	- added click handler. This is fired if the user simply clicks and does not swipe. The event object and click target are passed to handler.
*					- If you use the http://code.google.com/p/jquery-ui-for-ipad-and-iphone/ plugin, you can also assign jQuery mouse events to children of a touchSwipe object.
* $version: 1.2.1 	- removed console log!
*
* $version: 1.2.2 	- Fixed bug where scope was not preserved in callback methods. 
*
* $Date: 2011-28-04 (Thurs, 28 April 2011) $
* $version: 1.2.4 	- Changed licence terms to be MIT or GPL inline with jQuery. Added check for support of touch events to stop non compatible browsers erroring.
*
* $Date: 2011-27-09 (Tues, 27 September 2011) $
* $version: 1.2.5 	- Added support for testing swipes with mouse on desktop browser (thanks to https://github.com/joelhy)
*
* $Date: 2012-14-05 (Mon, 14 May 2012) $
* $version: 1.2.6 	- Added timeThreshold between start and end touch, so user can ignore slow swipes (thanks to Mark Chase). Default is null, all swipes are detected
* 
* $Date: 2012-05-06 (Tues, 05 June 2012) $
* $version: 1.2.7 	- Changed time threshold to have null default for backwards compatibility. Added duration param passed back in events, and refactored how time is handled.
*
* $Date: 2012-05-06 (Tues, 05 June 2012) $
* $version: 1.2.8 	- Added the possibility to return a value like null or false in the trigger callback. In that way we can control when the touch start/move should take effect or not (simply by returning in some cases return null; or return false;) This effects the ontouchstart/ontouchmove event.
*
* $Date: 2012-06-06 (Wed, 06 June 2012) $
* $version: 1.3.0 	- Refactored whole plugin to allow for methods to be executed, as well as exposed defaults for user override. Added 'enable', 'disable', and 'destroy' methods
*
* $Date: 2012-05-06 (Fri, 05 June 2012) $
* $version: 1.3.1 	- Bug fixes  - bind() with false as last argument is no longer supported in jQuery 1.6, also, if you just click, the duration is now returned correctly.
*
* $Date: 2012-29-07 (Sun, 29 July 2012) $
* $version: 1.3.2	- Added fallbackToMouseEvents option to NOT capture mouse events on non touch devices.
* 			- Added "all" fingers value to the fingers property, so any combinatin of fingers triggers the swipe, allowing event handlers to check the finger count
*
* $Date: 2012-09-08 (Thurs, 9 Aug 2012) $
* $version: 1.3.3	- Code tidy prep for minified version
*
* $Date: 2012-04-10 (wed, 4 Oct 2012) $
* $version: 1.4.0	- Added pinch support, pinchIn and pinchOut
*
* $Date: 2012-11-10 (Thurs, 11 Oct 2012) $
* $version: 1.5.0	- Added excludedElements, a jquery selector that specifies child elements that do NOT trigger swipes. By default, this is one select that removes all form, input select, button and anchor elements.
*
* $Date: 2012-22-10 (Mon, 22 Oct 2012) $
* $version: 1.5.1	- Fixed bug with jQuery 1.8 and trailing comma in excludedElements
*
* A jQuery plugin to capture left, right, up and down swipes on touch devices.
* You can capture 2 finger or 1 finger swipes, set the threshold and define either a catch all handler, or individual direction handlers.
* Options: The defaults can be overridden by setting them in $.fn.swipe.defaults
* 		swipe 			Function 	A catch all handler that is triggered for all swipe directions. Handler is passed 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down" , the distance of the swipe, the duration of the swipe and the finger count.
* 		swipeLeft		Function 	A handler that is triggered for "left" swipes. Handler is passed 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down"  , the distance of the swipe, the duration of the swipe and the finger count.
* 		swipeRight		Function 	A handler that is triggered for "right" swipes. Handler is passed 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down"  , the distance of the swipe, the duration of the swipe and the finger count.
* 		swipeUp			Function 	A handler that is triggered for "up" swipes. Handler is passed 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down" , the distance of the swipe, the duration of the swipe and the finger count.
* 		swipeDown		Function 	A handler that is triggered for "down" swipes. Handler is passed 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down"  , the distance of the swipe, the duration of the swipe and the finger count.
*		swipeStatus 	Function 	A handler triggered for every phase of the swipe. Handler is passed 4 arguments: event : The original event object, phase:The current swipe phase, either "start", "move", "end" or "cancel". direction : The swipe direction, either "up?, "down?, "left " or "right?.distance : The distance of the swipe.Duration : The duration of the swipe :  The finger count
*		
* 		pinchIn			Function 	A handler triggered when the user pinch zooms inward. Handler is passed 
* 		pinchOut		Function 	A handler triggered when the user pinch zooms outward. Handler is passed
* 		pinchStatus		Function 	A handler triggered for every phase of a pinch. Handler is passed 4 arguments: event : The original event object, phase:The current swipe face, either "start", "move", "end" or "cancel". direction : The swipe direction, either "in" or "out". distance : The distance of the pinch, zoom: the pinch zoom level
* 		
* 		click			Function	A handler triggered when a user just clicks on the item, rather than swipes it. If they do not move, click is triggered, if they do move, it is not.
*
* 		fingers 		int 		Default 1. 	The number of fingers to trigger the swipe, 1 or 2.
* 		threshold 		int  		Default 75.	The number of pixels that the user must move their finger by before it is considered a swipe.
* 		maxTimeThreshold 	int  		Default null. Time, in milliseconds, between touchStart and touchEnd must NOT exceed in order to be considered a swipe.
*		triggerOnTouchEnd Boolean Default true If true, the swipe events are triggered when the touch end event is received (user releases finger).  If false, it will be triggered on reaching the threshold, and then cancel the touch event automatically.
*		allowPageScroll String Default "auto". How the browser handles page scrolls when the user is swiping on a touchSwipe object. 
*										"auto" : all undefined swipes will cause the page to scroll in that direction.
*										"none" : the page will not scroll when user swipes.
*										"horizontal" : will force page to scroll on horizontal swipes.
*										"vertical" : will force page to scroll on vertical swipes.
*		fallbackToMouseEvents 	Boolean		Default true	if true mouse events are used when run on a non touch device, false will stop swipes being triggered by mouse events on non tocuh devices
*
*		excludedElements	String 	jquery selector that specifies child elements that do NOT trigger swipes. By default, this is one select that removes all input, select, textarea, button and anchor elements as well as any .noSwipe classes.
*
* Methods: To be executed as strings, $el.swipe('disable');
*		disable		Will disable all touch events until enabled again
*		enable		Will re-enable the touch events
*		destroy		Will kill the plugin, and it must be re-instantiated if it needs to be used again
*
* This jQuery plugin will only run on devices running Mobile Webkit based browsers (iOS 2.0+, android 2.2+)
*
* Modified By Taogi Develope Team
*	1. add mouseleave envent handler
*	2. fetch mousemove envent handler
*		divide mousemove(touchmove) event and mousedown(touchstart)
*/
(function ($) {

	//Constants
	var LEFT = "left",
		RIGHT = "right",
		UP = "up",
		DOWN = "down",
		IN = "in",
		OUT = "out",

		NONE = "none",
		AUTO = "auto",

		HORIZONTAL = "horizontal",
		VERTICAL = "vertical",

		ALL_FINGERS = "all",

		PHASE_START = "start",
		PHASE_MOVE = "move",
		PHASE_END = "end",
		PHASE_CANCEL = "cancel",

		SUPPORTS_TOUCH = 'ontouchstart' in window,

		PLUGIN_NS = 'TouchSwipe';

	window.performance = window.performance || {};
	performance.now = (function() {
		return performance.now	   ||
		performance.mozNow	||
		performance.msNow	 ||
		performance.oNow	  ||
		performance.webkitNow ||
		function() { return new Date().getTime(); };
	})();

	// Default thresholds & swipe functions
	var touchSwipt_defaults = {
		fingers: 1, 		// int - The number of fingers to trigger the swipe, 1 or 2. Default is 1.
		threshold: 75, 		// int - The number of pixels that the user must move their finger by before it is considered a swipe. Default is 75.

		maxTimeThreshold: null, // int - Time, in milliseconds, between touchStart and touchEnd must NOT exceed in order to be considered a swipe.

		swipe: null, 		// Function - A catch all handler that is triggered for all swipe directions. Accepts 2 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down", and the finger count.
		swipeLeft: null, 	// Function - A handler that is triggered for "left" swipes. Accepts 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down", the distance of the swipe, and the finger count.
		swipeRight: null, 	// Function - A handler that is triggered for "right" swipes. Accepts 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down", the distance of the swipe, and the finger count.
		swipeUp: null, 		// Function - A handler that is triggered for "up" swipes. Accepts 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down", the distance of the swipe, and the finger count.
		swipeDown: null, 	// Function - A handler that is triggered for "down" swipes. Accepts 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down", the distance of the swipe, and the finger count.
		swipeStatus: null, 	// Function - A handler triggered for every phase of the swipe. Handler is passed 4 arguments: event : The original event object, phase:The current swipe phase, either "start, "move, "end or "cancel. direction : The swipe direction, either "up", "down", "left" or "right". distance : The distance of the swipe, fingerCount: The finger count.
		
		pinchIn:null,		// Function - A handler triggered for pinch in events. Handler is passed 4 arguments: event : The original event object, direction : The swipe direction, either "in" or "out". distance : The distance of the pinch, zoom: the pinch zoom level
		pinchOut:null,		// Function - A handler triggered for pinch in events. Handler is passed 4 arguments: event : The original event object, direction : The swipe direction, either "in" or "out". distance : The distance of the pinch, zoom: the pinch zoom level
		pinchStatus:null,	// Function - A handler triggered for every phase of a pinch. Handler is passed 4 arguments: event : The original event object, phase:The current swipe face, either "start", "move", "end" or "cancel". direction : The swipe direction, either "in" or "out". distance : The distance of the pinch, zoom: the pinch zoom level
		
		click: null, 		// Function	- A handler triggered when a user just clicks on the item, rather than swipes it. If they do not move, click is triggered, if they do move, it is not.
		
		
		triggerOnTouchEnd: true, // Boolean, if true, the swipe events are triggered when the touch end event is received (user releases finger).  If false, it will be triggered on reaching the threshold, and then cancel the touch event automatically.
		allowPageScroll: "auto", 	/* How the browser handles page scrolls when the user is swiping on a touchSwipe object. 
										"auto" : all undefined swipes will cause the page to scroll in that direction.
										"none" : the page will not scroll when user swipes.
										"horizontal" : will force page to scroll on horizontal swipes.
										"vertical" : will force page to scroll on vertical swipes.
									*/
		fallbackToMouseEvents: true,	//Boolean, if true mouse events are used when run on a non touch device, false will stop swipes being triggered by mouse events on non tocuh devices
		
		excludedElements:"button, input, select, textarea, a, .noSwipe" //a jquery selector that specifies child elements that do NOT trigger swipes. By default, this is one select that removes all form, input select, button and anchor elements.
	};

	/**
	* Main plugin entry point for jQuery
	* This allows us to pass options object for instantiation,
	* as well as execute methods by name as per jQuery plugin architecture
	*/
	$.fn.swipe = function (method) {
		var $this = $(this),
			plugin = $this.data(PLUGIN_NS);

		//Check if we are already instantiated and trying to execute a method	
		if (plugin && typeof method === 'string') {
			if (plugin[method]) {
				return plugin[method].apply(this, Array.prototype.slice.call(arguments, 1));
			} else {
				$.error('Method ' + method + ' does not exist on jQuery.swipe');
			}
		}
		//Else not instantiated and trying to pass init object (or nothing)
		else if (!plugin && (typeof method === 'object' || !method)) {
			return touchSwip_init.apply(this, arguments);
		}

		return $this;
	};

	//Expose our defaults so a user could override the plugin defaults
	$.fn.swipe.defaults = touchSwipt_defaults;

	//Expose our phase constants - READ ONLY
	$.fn.swipe.phases = {
		PHASE_START: PHASE_START,
		PHASE_MOVE: PHASE_MOVE,
		PHASE_END: PHASE_END,
		PHASE_CANCEL: PHASE_CANCEL
	};

	//Expose our direction constants - READ ONLY
	$.fn.swipe.directions = {
		LEFT: LEFT,
		RIGHT: RIGHT,
		UP: UP,
		DOWN: DOWN,
		IN : IN,
		OUT: OUT
	};
	
	//Expose our page scroll directions - READ ONLY
	$.fn.swipe.pageScroll = {
		NONE: NONE,
		HORIZONTAL: HORIZONTAL,
		VERTICAL: VERTICAL,
		AUTO: AUTO
	};

	//EXPOSE our fingers values - READ ONLY
	$.fn.swipe.fingers = {
		ONE: 1,
		TWO: 2,
		THREE: 3,
		ALL: ALL_FINGERS
	};

	/**
	* Initialise the plugin for each DOM element matched
	* This creates a new instance of the main TouchSwipe class for each DOM element, and then 
	* saves a reference to that instance in the elements data property.
	*/
	function touchSwip_init(options) {
		//Prep and extend the options
		if (options && (options.allowPageScroll === undefined && (options.swipe !== undefined || options.swipeStatus !== undefined))) {
			options.allowPageScroll = NONE;
		}

		if (!options) {
			options = {};
		}

		//pass empty object so we dont modify the defaults
		options = $.extend({}, $.fn.swipe.defaults, options);

		//For each element instantiate the plugin
		return this.each(function () {
			var $this = $(this);

			//Check we havent already initialised the plugin
			var plugin = $this.data(PLUGIN_NS);

			if (!plugin) {
				plugin = new touchSwipe(this, options);
				$this.data(PLUGIN_NS, plugin);
			}
		});
	}

	/**
	* Main TouchSwipe Plugin Class
	*/
	function touchSwipe(element, options) {
		var useTouchEvents = (SUPPORTS_TOUCH || !options.fallbackToMouseEvents),
			START_EV = useTouchEvents ? 'touchstart' : 'mousedown',
			MOVE_EV = useTouchEvents ? 'touchmove' : 'mousemove',
			END_EV = useTouchEvents ? 'touchend' : 'mouseup',
			LEAVE_EV = 'mouseleave',
			CANCEL_EV = 'touchcancel';

		var distance = 0;
		var direction = null;
		var duration = 0;
		var startTouchesDistance=0;
		var endTouchesDistance=0;
		var pinchZoom = 1;
		var pinchDirection=0;
		var moveCnt=0;
		
		
		//jQuery wrapped element for this instance
		var $element = $(element);

		var phase = "start";

		var fingerCount = 0; 		// the current number of fingers being used.	

		//track mouse points / delta
		var fingerData=null;

		//track times
		var startTime = 0;
		var endTime = 0;

		// Add gestures to all swipable areas if supported
		try {
			$element.bind(START_EV, touchStart);
			$element.bind(MOVE_EV, touchMove);
			$element.bind(LEAVE_EV, touchEnd);
			$element.bind(END_EV, touchEnd);
			$element.bind(CANCEL_EV, touchCancel);
		}
		catch (e) {
			$.error('events not supported ' + START_EV + ',' + CANCEL_EV + ' on jQuery.swipe');
		}

		//Public methods
		/**
		* re-enables the swipe plugin with the previous configuration
		*/
		this.enable = function () {
			$element.bind(START_EV, touchStart);
			$element.bind(MOVE_EV, touchMove);
			$element.bind(LEAVE_EV, touchEnd);
			$element.bind(END_EV, touchEnd);
			$element.bind(CANCEL_EV, touchCancel);

			return $element;
		};

		/**
		* disables the swipe plugin
		*/
		this.disable = function () {
			removeListeners();
			return $element;
		};

		/**
		* Destroy the swipe plugin completely. To use any swipe methods, you must re initialise the plugin.
		*/
		this.destroy = function () {
			removeListeners();
			$element.data(PLUGIN_NS, null);
			return $element;
		};


		//Private methods
		/**
		* Event handler for a touch start event. 
		* Stops the default click event from triggering and stores where we touched
		*/
		function touchStart(event) {
			//If we already in a touch event (a finger already in use) then ignore subsequent ones..
			if( getTouchInProgress() )
				return;
			
			//Check if this element matches any in the excluded elements selectors,  or its parent is excluded, if so, DONT swipe
			if( $(event.target).closest( options.excludedElements, $element ).length>0 ) 
				return;
				
			//As we use Jquery bind for events, we need to target the original event object
			if(SUPPORTS_TOUCH)
				event = event.originalEvent;
			
			var ret,
				evt = SUPPORTS_TOUCH ? event.touches[0] : event;

			phase = PHASE_START;

			//If we support touches, get the finger count
			if (SUPPORTS_TOUCH) {
				// get the total number of fingers touching the screen
				fingerCount = event.touches.length;
			}
			//Else this is the desktop, so stop the browser from dragging the image
			event.preventDefault ? event.preventDefault() : event.returnValue = false;

			//clear vars..
			distance = 0;
			direction = null;
			pinchDirection=null;
			duration = 0;
			startTouchesDistance=0;
			endTouchesDistance=0;
			pinchZoom = 1;
			fingerData=createFingerData();

			
			// check the number of fingers is what we are looking for, or we are capturing pinches
			if (!SUPPORTS_TOUCH || (fingerCount <= options.fingers || options.fingers === ALL_FINGERS) || hasPinches()) {
				// get the coordinates of the touch
				fingerData[0].start.x = fingerData[0].end.x = evt.pageX;
				fingerData[0].start.y = fingerData[0].end.y = evt.pageY;
				startTime = getTimeStamp();
				
				if(fingerCount==2) {
					//Keep track of the initial pinch distance, so we can calculate the diff later
					//Store second finger data as start
					fingerData[1].start.x = fingerData[1].end.x = event.touches[1].pageX;
					fingerData[1].start.y = fingerData[1].end.y = event.touches[1].pageY;
					
					startTouchesDistance = endTouchesDistance = calculateTouchesDistance(fingerData[0].start, fingerData[1].start);
				}
				
				if (options.swipeStatus || options.pinchStatus) {
					ret = triggerHandler(event, phase);
				}
			}
			else {
				//A touch with more or less than the fingers we are looking for, so cancel
				touchCancel(event);
				ret = false; // actualy cancel so we dont register event...
			}

			//If we have a return value from the users handler, then return and cancel
			if (ret === false) {
				phase = PHASE_CANCEL;
				triggerHandler(event, phase);
				return ret;
			}
			else {
				setTouchInProgress(true);
				
			}
		};

		/**
		* Event handler for a touch move event. 
		* If we change fingers during move, then cancel the event
		*/
		function touchMove(event) {
			//As we use Jquery bind for events, we need to target the original event object
			if(SUPPORTS_TOUCH)
				event = event.originalEvent;

			if(getTouchInProgress() == false)
				return;

			if (phase === PHASE_END || phase === PHASE_CANCEL)
				return;

			var ret,
				evt = SUPPORTS_TOUCH ? event.touches[0] : event;

			//Save the first finger data
			fingerData[0].end.x = SUPPORTS_TOUCH ? event.touches[0].pageX : evt.pageX;
			fingerData[0].end.y = SUPPORTS_TOUCH ? event.touches[0].pageY : evt.pageY;

			endTime = getTimeStamp();

			direction = calculateDirection(fingerData[0].start, fingerData[0].end);
			if (SUPPORTS_TOUCH) {
				fingerCount = event.touches.length;
			}

			phase = PHASE_MOVE;

			//If we have 2 fingers get Touches distance as well
			if(fingerCount==2) {
				//Keep track of the initial pinch distance, so we can calculate the diff later
				//We do this here as well as the start event, incase they start with 1 finger, and the press 2 fingers
				if(startTouchesDistance==0) {
					//Store second finger data as start
					fingerData[1].start.x = event.touches[1].pageX;
					fingerData[1].start.y = event.touches[1].pageY;
					
					startTouchesDistance = endTouchesDistance = calculateTouchesDistance(fingerData[0].start, fingerData[1].start);
				} else {
					//Store second finger data as end
					fingerData[1].end.x = event.touches[1].pageX;
					fingerData[1].end.y = event.touches[1].pageY;
					
					endTouchesDistance = calculateTouchesDistance(fingerData[0].end, fingerData[1].end);
					pinchDirection = calculatePinchDirection(fingerData[0].end, fingerData[1].end);
				}
				
				
				pinchZoom = calculatePinchZoom(startTouchesDistance, endTouchesDistance);
			}
			
			
			
			if ((fingerCount <= options.fingers || options.fingers === ALL_FINGERS) || !SUPPORTS_TOUCH) {
				
				//Check if we need to prevent default evnet (page scroll / pinch zoom) or not
				validateDefaultEvent(event, direction);

				//Distance and duration are all off the main finger
				distance = calculateDistance(fingerData[0].start, fingerData[0].end);
				duration = calculateDuration(fingerData[0].start, fingerData[0].end);

				if (options.swipeStatus || options.pinchStatus) {
					ret = triggerHandler(event, phase);
				}

				//If we trigger whilst dragging, not on touch end, then calculate now...
				if (!options.triggerOnTouchEnd) {
					var cancel = !validateSwipeTime();

					// if the user swiped more than the minimum length, perform the appropriate action
					if (validateSwipeDistance() === true) {
						phase = PHASE_END;
						ret = triggerHandler(event, phase);
					} else if (cancel) {
						phase = PHASE_CANCEL;
						triggerHandler(event, phase);
					}
				}
			}
			else {
				phase = PHASE_CANCEL;
				triggerHandler(event, phase);
			}

			if (ret === false) {
				phase = PHASE_CANCEL;
				triggerHandler(event, phase);
			}
		}

		/**
		* Event handler for a touch end event. 
		* Calculate the direction and trigger events
		*/
		function touchEnd(event) {
			//As we use Jquery bind for events, we need to target the original event object
			if(SUPPORTS_TOUCH)
				event = event.originalEvent;

			//If we are still in a touch another finger is down, then dont cancel
			if(event.touches && event.touches.length>0)
				return true;
			if(getTouchInProgress() == false) 
				return;
				 
			event.preventDefault ? event.preventDefault() : event.returnValue = false;

			endTime = getTimeStamp();
			
			//If we have any touches distance data (they pinched at some point) get Touches distance as well
			if(startTouchesDistance!=0) {
				endTouchesDistance = calculateTouchesDistance(fingerData[0].end, fingerData[1].end);
				pinchZoom = calculatePinchZoom(startTouchesDistance, endTouchesDistance);
				pinchDirection = calculatePinchDirection(fingerData[0].end, fingerData[1].end);	
			}
			
			distance = calculateDistance(fingerData[0].start, fingerData[0].end);
			direction = calculateDirection(fingerData[0].start, fingerData[0].end);
			duration = calculateDuration();

			//If we trigger handlers at end of swipe OR, we trigger during, but they didnt trigger and we are still in the move phase
			if (options.triggerOnTouchEnd || (options.triggerOnTouchEnd === false && phase === PHASE_MOVE)) {
				phase = PHASE_END;

				// Validate the types of swipe we are looking for
				//Either we are listening for a pinch, and got one, or we are NOT listening so dont care.
				var hasValidPinchResult = didPinch() || !hasPinches();
				
				//The number of fingers we want were matched, or on desktop we ignore
				var hasCorrectFingerCount = ((fingerCount <= options.fingers || options.fingers === ALL_FINGERS) || !SUPPORTS_TOUCH);

				//We have an end value for the finger
				var hasEndPoint = fingerData[0].end.x !== 0;
				
				//Check if the above conditions are met to make this swipe count...
				var isSwipe = (hasCorrectFingerCount && hasEndPoint && hasValidPinchResult);
				
				//If we are in a swipe, validate the time and distance...
				if (isSwipe) {
					var hasValidTime = validateSwipeTime();
					
					//Check the distance meets threshold settings
					var hasValidDistance = validateSwipeDistance();
					
					// if the user swiped more than the minimum length, perform the appropriate action
					// hasValidDistance is null when no distance is set 
					if ((hasValidDistance === true || hasValidDistance === null) && hasValidTime) {
						triggerHandler(event, phase);
					}
					else if (!hasValidTime || hasValidDistance === false) {
						phase = PHASE_CANCEL;
						triggerHandler(event, phase);
					}
				}
				else {
					phase = PHASE_CANCEL;
					triggerHandler(event, phase);
				}
			}
			else if (phase === PHASE_MOVE) {
				phase = PHASE_CANCEL;
				triggerHandler(event, phase);
			}

			setTouchInProgress(false);
		}

		/**
		* Event handler for a touch cancel event. 
		* Clears current vars
		*/
		function touchCancel() {
			// reset the variables back to default values
			fingerCount = 0;
			endTime = 0;
			startTime = 0;
			startTouchesDistance=0;
			endTouchesDistance=0;
			pinchZoom=1;
			setTouchInProgress(false);
		}


		/**
		* Trigger the relevant event handler
		* The handlers are passed the original event, the element that was swiped, and in the case of the catch all handler, the direction that was swiped, "left", "right", "up", or "down"
		*/
		function triggerHandler(event, phase) {
			var ret = undefined;

			//update status
			if (options.swipeStatus) {
				ret = options.swipeStatus.call($element, event, phase, direction || null, distance || 0, duration || 0, fingerCount);
			}
			
			if (options.pinchStatus && didPinch()) {
				ret = options.pinchStatus.call($element, event, phase, pinchDirection || null, endTouchesDistance || 0, duration || 0, fingerCount, pinchZoom);
			}

			if (phase === PHASE_CANCEL) {
				if (options.click && (fingerCount === 1 || !SUPPORTS_TOUCH) && (isNaN(distance) || distance === 0)) {
					ret = options.click.call($element, event, event.target);
				}
			}
			
			if (phase == PHASE_END) {
				//trigger catch all event handler
				if (options.swipe) {
					ret = options.swipe.call($element, event, direction, distance, duration, fingerCount);
				}
				//trigger direction specific event handlers	
				switch (direction) {
					case LEFT:
						if (options.swipeLeft) {
							ret = options.swipeLeft.call($element, event, direction, distance, duration, fingerCount);
						}
						break;

					case RIGHT:
						if (options.swipeRight) {
							ret = options.swipeRight.call($element, event, direction, distance, duration, fingerCount);
						}
						break;

					case UP:
						if (options.swipeUp) {
							ret = options.swipeUp.call($element, event, direction, distance, duration, fingerCount);
						}
						break;

					case DOWN:
						if (options.swipeDown) {
							ret = options.swipeDown.call($element, event, direction, distance, duration, fingerCount);
						}
						break;
				}
				
				
				switch (pinchDirection) {
					case IN:
						if (options.pinchIn) {
							ret = options.pinchIn.call($element, event, pinchDirection || null, endTouchesDistance || 0, duration || 0, fingerCount, pinchZoom);
						}
						break;
					
					case OUT:
						if (options.pinchOut) {
							ret = options.pinchOut.call($element, event, pinchDirection || null, endTouchesDistance || 0, duration || 0, fingerCount, pinchZoom);
						}
						break;	
				}
			}


			if (phase === PHASE_CANCEL || phase === PHASE_END) {
				//Manually trigger the cancel handler to clean up data
				touchCancel(event);
			}

			return ret;
		}


		/**
		* Checks the user has swipe far enough
		*/
		function validateSwipeDistance() {
			if (options.threshold !== null) {
				return distance >= options.threshold;
			}
			return null;
		}



		/**
		* Checks that the time taken to swipe meets the minimum / maximum requirements
		*/
		function validateSwipeTime() {
			var result;
			//If no time set, then return true

			if (options.maxTimeThreshold) {
				if (duration >= options.maxTimeThreshold) {
					result = false;
				} else {
					result = true;
				}
			}
			else {
				result = true;
			}

			return result;
		}


		/**
		* Checks direction of the swipe and the value allowPageScroll to see if we should allow or prevent the default behaviour from occurring.
		* This will essentially allow page scrolling or not when the user is swiping on a touchSwipe object.
		*/
		function validateDefaultEvent(event, direction) {
			if (options.allowPageScroll === NONE || hasPinches()) {
				event.preventDefault ? event.preventDefault() : event.returnValue = false;
			} else {
				var auto = options.allowPageScroll === AUTO;

				switch (direction) {
					case LEFT:
						if ((options.swipeLeft && auto) || (!auto && options.allowPageScroll != HORIZONTAL)) {
							event.preventDefault ? event.preventDefault() : event.returnValue = false;
						}
						break;

					case RIGHT:
						if ((options.swipeRight && auto) || (!auto && options.allowPageScroll != HORIZONTAL)) {
							event.preventDefault ? event.preventDefault() : event.returnValue = false;
						}
						break;

					case UP:
						if ((options.swipeUp && auto) || (!auto && options.allowPageScroll != VERTICAL)) {
							event.preventDefault ? event.preventDefault() : event.returnValue = false;
						}
						break;

					case DOWN:
						if ((options.swipeDown && auto) || (!auto && options.allowPageScroll != VERTICAL)) {
							event.preventDefault ? event.preventDefault() : event.returnValue = false;
						}
						break;
				}
			}

		}


		/**
		* Calcualte the duration of the swipe
		*/
		function calculateDuration() {
			return endTime - startTime;
		}
		
		/**
		* Calculate the distance between 2 touches (pinch)
		*/
		function calculateTouchesDistance(startPoint, endPoint) {
			var diffX = Math.abs(startPoint.x - endPoint.x);
			var diffY = Math.abs(startPoint.y - endPoint.y);
				
			return Math.round(Math.sqrt(diffX*diffX+diffY*diffY));
		}
		
		/**
		* Calculate the zoom factor between the start and end distances
		*/
		function calculatePinchZoom(startDistance, endDistance) {
			var percent = (endDistance/startDistance) * 1;
			return percent.toFixed(2);
		}
		
		
		/**
		* Returns the pinch direction, either IN or OUT for the given points
		*/
		function calculatePinchDirection() {
			if(pinchZoom<1) {
				return OUT;
			}
			else {
				return IN;
			}
		}
		
		
		/**
		* Calculate the length / distance of the swipe
		* @param finger A finger object containing start and end points
		*/
		function calculateDistance(startPoint, endPoint) {
			return Math.round(Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)));
		}

		/**
		* Calcualte the angle of the swipe
		* @param finger A finger object containing start and end points
		*/
		function caluculateAngle(startPoint, endPoint) {
			var x = startPoint.x - endPoint.x;
			var y = endPoint.y - startPoint.y;
			var r = Math.atan2(y, x); //radians
			var angle = Math.round(r * 180 / Math.PI); //degrees

			//ensure value is positive
			if (angle < 0) {
				angle = 360 - Math.abs(angle);
			}

			return angle;
		}

		/**
		* Calcualte the direction of the swipe
		* This will also call caluculateAngle to get the latest angle of swipe
		* @param finger A finger object containing start and end points
		*/
		function calculateDirection(startPoint, endPoint ) {
			var angle = caluculateAngle(startPoint, endPoint);

			if ((angle <= 45) && (angle >= 0)) {
				return LEFT;
			} else if ((angle <= 360) && (angle >= 315)) {
				return LEFT;
			} else if ((angle >= 135) && (angle <= 225)) {
				return RIGHT;
			} else if ((angle > 45) && (angle < 135)) {
				return DOWN;
			} else {
				return UP;
			}
		}
		

		/**
		* Returns a MS time stamp of the current time
		*/
		function getTimeStamp() {
			return performance.now();
		}

		/**
		* Removes all listeners that were associated with the plugin
		*/
		function removeListeners() {
			$element.unbind(START_EV, touchStart);
			$element.unbind(CANCEL_EV, touchCancel);
			$element.unbind(MOVE_EV, touchMove);
			$element.unbind(END_EV, touchEnd);
			$element.unbind(LEAVE_EV, touchEnd);
			setTouchInProgress(false);
		}
		
		/**
		 * Returns true if any Pinch events have been registered
		 */
		function hasPinches() {
			return options.pinchStatus || options.pinchIn || options.pinchOut;
		}
		
		/**
		 * Returns true if we are detecting pinches, and have one
		 */
		function didPinch() {
			return pinchDirection && hasPinches();
		}
		

		
		/**
		* gets a data flag to indicate that a touch is in progress
		*/
		function getTouchInProgress() {
			return $element.data(PLUGIN_NS+'_intouch') === true ? true : false;
		}
		
		/**
		* Sets a data flag to indicate that a touch is in progress
		*/
		function setTouchInProgress(val) {
			val = val===true?true:false;
			$element.data(PLUGIN_NS+'_intouch', val);
		}
		
		function createFingerData() {
			var fingerData=[];
			for (var i=0; i<=5; i++) {
				fingerData.push({
					start:{ x: 0, y: 0 },
					end:{ x: 0, y: 0 },
					delta:{ x: 0, y: 0 }
				});
			}
			
			return fingerData;
		}

	}

/*******************************************************
 * define easing for webkit css
 *******************************************************/
	$.cssEase = {
		'_default':	   'ease',
		'in':			 'ease-in',
		'out':			'ease-out',
		'in-out':		 'ease-in-out',
		'snap':		   'cubic-bezier(0,1,.5,1)',

		'easeOutCubic':   'cubic-bezier(.215,.61,.355,1)',
		'easeInOutCubic': 'cubic-bezier(.645,.045,.355,1)',
		'easeInCirc':	 'cubic-bezier(.6,.04,.98,.335)',
		'easeOutCirc':	'cubic-bezier(.075,.82,.165,1)',
		'easeInOutCirc':  'cubic-bezier(.785,.135,.15,.86)',
		'easeInExpo':	 'cubic-bezier(.95,.05,.795,.035)',
		'easeOutExpo':	'cubic-bezier(.19,1,.22,1)',
		'easeInOutExpo':  'cubic-bezier(1,0,0,1)',
		'easeInQuad':	 'cubic-bezier(.55,.085,.68,.53)',
		'easeOutQuad':	'cubic-bezier(.25,.46,.45,.94)',
		'easeInOutQuad':  'cubic-bezier(.455,.03,.515,.955)',
		'easeInQuart':	'cubic-bezier(.895,.03,.685,.22)',
		'easeOutQuart':   'cubic-bezier(.165,.84,.44,1)',
		'easeInOutQuart': 'cubic-bezier(.77,0,.175,1)',
		'easeInQuint':	'cubic-bezier(.755,.05,.855,.06)',
		'easeOutQuint':   'cubic-bezier(.23,1,.32,1)',
		'easeInOutQuint': 'cubic-bezier(.86,0,.07,1)',
		'easeInSine':	 'cubic-bezier(.47,0,.745,.715)',
		'easeOutSine':	'cubic-bezier(.39,.575,.565,1)',
		'easeInOutSine':  'cubic-bezier(.445,.05,.55,.95)',
		'easeInBack':	 'cubic-bezier(.6,-.28,.735,.045)',
		'easeOutBack':	'cubic-bezier(.175, .885,.32,1.275)',
		'easeInOutBack':  'cubic-bezier(.68,-.55,.265,1.55)'
	};

/*
 * Taogi Carousel-Timeline V1.0
 *
 */

	$.Easingfunc = function(easing,t,b,c,d) {
		switch(easing) {
			case 'ease-in':
				return c*Math.pow(t/d,4.5)+ b;
			case 'ease-out':
				t/=d;
				return c*t*t + b;
			case 'ease-in-out':
				if ((t/=d/2) < 1) return c/2*t*t + b;
				return -c/2 * ((--t)*(t-2) - 1) + b;
			case 'linearTween':
				return c*t/d + b;
			// quadratic easing in - accelerating from zero velocity
			case 'easeInQuad':
				t /= d;
				return c*t*t + b;
			// quadratic easing out - decelerating to zero velocity
			case 'easeOutQuad':
				t /= d;
				return -c * t*(t-2) + b;
			// quadratic easing in/out - acceleration until halfway, then deceleration
			case 'easeInOutQuad':
				t /= d/2;
				if (t < 1) return c/2*t*t + b;
				t--;
				return -c/2 * (t*(t-2) - 1) + b;
			// cubic easing in - accelerating from zero velocity
			case 'easeInCubic':
				t /= d;
				return c*t*t*t + b;
			// cubic easing out - decelerating to zero velocity
			case 'easeOutCubic':
				t /= d;
				t--;
				return c*(t*t*t + 1) + b;
			// cubic easing in/out - acceleration until halfway, then deceleration
			case 'easeInOutCubic':
				t /= d/2;
				if (t < 1) return c/2*t*t*t + b;
				t -= 2;
				return c/2*(t*t*t + 2) + b;
			// quartic easing in - accelerating from zero velocity
			case 'easeInQuart':
				t /= d;
				return c*t*t*t*t + b;
			// quartic easing out - decelerating to zero velocity
			case 'easeOutQuart':
				t /= d;
				t--;
				return -c * (t*t*t*t - 1) + b;
			// quartic easing in/out - acceleration until halfway, then deceleration
			case 'easeInOutQuart':
				t /= d/2;
				if (t < 1) return c/2*t*t*t*t + b;
				t -= 2;
				return -c/2 * (t*t*t*t - 2) + b;
			// quintic easing in - accelerating from zero velocity
			case 'easeInQuint':
				t /= d;
				return c*t*t*t*t*t + b;
			// quintic easing out - decelerating to zero velocity
			case 'easeOutQuint':
				t /= d;
				t--;
				return c*(t*t*t*t*t + 1) + b;
			// quintic easing in/out - acceleration until halfway, then deceleration
			case 'easeInOutQuint':
				t /= d/2;
				if (t < 1) return c/2*t*t*t*t*t + b;
				t -= 2;
				return c/2*(t*t*t*t*t + 2) + b;
			// sinusoidal easing in - accelerating from zero velocity
			case 'easeInSine':
				return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
			// sinusoidal easing out - decelerating to zero velocity
			case 'easeOutSine':
				return c * Math.sin(t/d * (Math.PI/2)) + b;
			// sinusoidal easing in/out - accelerating until halfway, then decelerating
			case 'easeInOutSine':
				return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
			// exponential easing in - accelerating from zero velocity
			case 'easeInExpo':
				return c * Math.pow( 2, 10 * (t/d - 1) ) + b;
			// exponential easing out - decelerating to zero velocity
			case 'easeOutExpo':
				return c * ( -Math.pow( 2, -10 * t/d ) + 1 ) + b;
			// exponential easing in/out - accelerating until halfway, then decelerating
			case 'easeInOutExpo':
				t /= d/2;
				if (t < 1) return c/2 * Math.pow( 2, 10 * (t - 1) ) + b;
				t--;
				return c/2 * ( -Math.pow( 2, -10 * t) + 2 ) + b;
			// circular easing in - accelerating from zero velocity
			case 'easeInCirc':
				t /= d;
				return -c * (Math.sqrt(1 - t*t) - 1) + b;
			// circular easing out - decelerating to zero velocity
			case 'easeOutCirc':
				t /= d;
				t--;
				return c * Math.sqrt(1 - t*t) + b;
			// circular easing in/out - acceleration until halfway, then deceleration
			case 'easeInOutCirc':
				t /= d/2;
				if (t < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
				t -= 2;
				return c/2 * (Math.sqrt(1 - t*t) + 1) + b;
			default:
				return c*t/d + b;
		}
		return null;
	}

	function TaogiTouchCarousel(element,options) {
		var self = this;
		TaogiTouchCarouselObj = this;
		this._isSwipping = false;
		this._isSliderSwipping = false;
		this._isIndicateSwipping = false;

		this.settings = $.extend({}, $.fn.taogiTouchCarousel.defaults, options);
		this.supports = {};
		taogiVMM.master_config.Timeline = this.settings;

		this.TLRoot = $(element);
		this.TLBox = this.TLRoot.wrap(jQuery('<div id="carousel-timeline-box" class="touchcarousel-timeline"></div>')).parent();
		this.TLBox.Position = this.TLBox.css('position');
		this.TLFrame = this.TLBox.next('#taogi-gnb').andSelf().wrapAll(jQuery('<div class="taogi-frame"></div>')).parent();
		this.TLFrame = this.TLBox.parent();
		if(taogiVMM.Browser.browser == "Explorer") {
			this.TLFrame.addClass('isie');
		}
		jQuery(this.settings.Smarkup).prependTo(this.TLFrame);
		this._bindGnb(self.TLFrame.find('.taogi-gnb-switch a'));
		jQuery('#taogi-gnb-body li a').click(function(e){
			jQuery(this).parent().toggleClass('checked');
		});
		this._TLContainer = this.TLRoot.find('.touchcarousel-container');
		this._TLContainerStyle = this._TLContainer[0].style;

		this._TLWrapper = this._TLContainer.wrap(jQuery('<div class="touchcarousel-wrapper"></div>')).parent();
		this.items = [];
		var Items = this._TLContainer.find('.touchcarousel-item');

		this._onSwipping;
		this._startPos=0;

		this._totalItemWidth = 0;
		this.tiWidth = 0;
		this.ticWidth = 0;

		var currPosX = 0;
		var CHeight = 0;

		if('ontouchstart' in window) {
			this.Friction = this.settings.TouchFriction;
			this.hasTouch = true;
		} else {
			this.Friction = this.settings.MouseFriction;
			this.hasTouch = false;
		}

		this.WebWorkerSupport = false;
		if(typeof(Worker) !== "undefined") this.WebWorkerSupport = true;
		
		function _getVendorPropertyName(prop) {
			var prefixes = ['Moz', 'Webkit', 'O', 'ms'];
			var prop_ = prop.charAt(0).toUpperCase() + prop.substr(1);

			for (var i=0; i<prefixes.length; ++i) {
				var vendorProp = prefixes[i] + prop_;
				if (vendorProp in self._TLContainerStyle) { return '-'+prefixes[i]+'-'+prop_; }
			}
		}

		var TransitionEndeventNames = {
			'transition':	   'transitionEnd',
			'-Moz-Transition':	'transitionend',
			'-O-Transition':	  'oTransitionEnd',
			'-Webkit-Transition': 'webkitTransitionEnd',
			'-ms-Transition':	 'msTransitionEnd'
		};

		/* check that the browser support transition */
		this._useWebkitTransition = false;
		this.supports.transition		= _getVendorPropertyName('transition');
		if(this.hasTouch || (this.settings.useWebkitTransition && this.supports.transition)) {
			this._useWebkitTransition = true;
			this.supports.transform	= _getVendorPropertyName('transform');
			this.supports.transitionEnd = TransitionEndeventNames[this.supports.transition] || null;
			this.supports.opacity = _getVendorPropertyName('opacity');
		}

		if(this._useWebkitTransition == false) {
			this.settings.switchGalleryMethod = 'fade';
			this.settings.fingerSwitchGalleryMethod = 'fade';
		}

		/* init social link */
		jQuery('ul.social a').click(function(e){
			window.open(jQuery(this).attr('href'),'popupWindow','width=600,height=400,scrollbars=no,menubar=no,status=no,toolbar=no');
		});

		/* init language pack */
		if(TaogiLanguagePack) {
			taogiVMM.getJSON(TaogiLanguagePack, function(d) {
				trace("Loading Language Pack");
				taogiVMM.languagePack = d;
			})
			.error(function(jqXHR, textStatus, errorThrown) {
				trace("Fail loading Language Pack");
			});
		}

		this.figures = [];

		var uid;
		var thumb;
		this.min_slide = Math.round(jQuery(window).width()/4)*(-1)
		this.max_slide = Math.round(jQuery(window).width()*1.25);
		this.snapToItem = false;
		this.totalItemCnt=0;
		var figure_index_cnt = 0;
		Items.each(function(index) {
			var item = jQuery(this);
			var iwidth = item.outerWidth(true);
			item.data('width',iwidth);
			if(iwidth > Math.abs(self.min_slide)) self.min_slide = iwidth * (-1.25);
			if((currPosX + iwidth) < self.min_slide) {
				self._setIPosition(item,self.min_slide,0);
			} else if(currPosX > self.max_slide) {
				self._setIPosition(item,self.max_slide,0);
			} else {
				self._setIPosition(item,currPosX,0);
			}
			item.data('index',index);
			var obj = {};
			obj.item = item;
			obj.index = index;
			obj.currX = currPosX;
			obj.posX = currPosX;
			obj.width = iwidth;
			obj.slidePos = 0;
			if(self.snapToItem == false && iwidth == self.TLRoot.width()) {
				taogiVMM.master_config.snapToItem = self.snapToItem = true;
			}
			obj.height = item.outerHeight(true);
			if(!obj.height) obj.height = item.find('.item-container').outerHeight(true);
			obj.id = item.attr('id');
			obj.fade = '';
			if(item.hasClass('cover')) {
				obj.isCover = true;
				jQuery('.taogi-gnb-switch span').html(item.find('h1.title').html());
			}
			else {
				obj.isCover = false;
				self.totalItemCnt++;
			}
			currPosX += obj.width;
			if(obj.height > CHeight) CHeight = obj.height;
			item.find('.section').each(function(idx) {
				if(jQuery(this).hasClass('article')) {
					obj.feature = jQuery(this);
				} else if(jQuery(this).hasClass('media')) {
					obj.gallery = jQuery(this);
				}
			});

			obj.hasMedia = false;
			var figures = jQuery(this).find('.figure');
			figures.each(function(index2) {
				obj.hasMedia = true;
				uid = taogiVMM.Util.unique_ID(6);
				if(jQuery(this).parent().hasClass('feature')) {
					thumb = 1;
					uid += "_thumb";
				} else {
					thumb = 0;
				}
				jQuery(this).attr('id',uid);
				if(!self.settings.maxfigureItemNum || self.settings.maxfigureItemNum >= index2) {
					var figure = jQuery(this);
					var obj2 = {};
					obj2.item = figure;
					obj2.uid = uid;
					obj2.url = figure.attr('href');
					if(!obj2.url) {
						jQuery(this).css({'display':'none'});
					} else {
						obj2.credit = figure.attr('credit');
						obj2.caption = figure.attr('caption');
						obj2.thumbnail = figure.attr('thumbnail');
						obj2.use_proxy = figure.attr('use_proxy');
						obj2.use_thumb_proxy = figure.attr('use_thumb_proxy');
						obj2.thumb = thumb;
						obj2.item_index = index;
						obj2.figure_index = index2;
						self.figures.push(obj2);
						figure.attr('index',figure_index_cnt);
						figure_index_cnt++;
					}
				} else {
					jQuery(this).css({'display':'none'});
				}
			});

			var g_container = jQuery(this).find('.gallery-container');
			var thumbnails = jQuery(this).find('ul.thumbnails li');
			obj.galleries = [];
			thumbnails.each(function(index3) {
				obj.hasMedia = true;
				var thumbnail = jQuery(this);
				var obj2 = {}
				obj2.url = thumbnail.attr('href');
				if(obj2.url) {
					obj2.uid = taogiVMM.Util.unique_ID(6);
					obj2.credit = thumbnail.attr('credit');
					obj2.caption = thumbnail.attr('caption');
					obj2.thumbnail = thumbnail.attr('thumbnail');
					obj2.use_proxy = thumbnail.attr('use_proxy');
					obj2.use_thumb_proxy = thumbnail.attr('use_thumb_proxy');
					var item = jQuery('<li class="gallery-item"><figure class="figure" id="'+obj2.uid+'" href="'+obj2.url+'" credit="'+obj2.credit+'" caption="'+obj2.caption+'" thumbnail="'+obj2.thumbnail+'" use_proxy="'+obj2.use_proxy+'"></figure></li>');
					obj2.item = item;
					obj2.index = index;
					obj2.g_index = index3;
					g_container.append(item);
					obj.galleries.push(obj2);
					thumbnail.addClass('thumbnail');
					thumbnail.attr('id','t_'+obj2.uid);
					thumbnail.attr('item-index',index);
					thumbnail.attr('g-index',index3);
				}
			});

			if(obj.hasMedia === false) item.addClass('noMedia');
			obj.gallery_loaded = 0;
			obj.gallery_cur = 0;
			item.find('.pubdate, .switch_gallery, .switch_mode').click(function(e) {
				e.preventDefault();
				if(obj.hasMedia === true) {
					self.switchGallery(obj.item,self.settings.switchGalleryMethod);
					self._initGallery(index);
				}
			});
			self.items.push(obj);
		});
		this._maxXPos = this._totalItemWidth = currPosX;
		this.sliderMax = Math.max(100,Math.round(this._totalItemWidth / 100));
		var win_width = jQuery(document).width();
		if(currPosX > win_width) {
			this.TLRoot.width(win_width);
			this._TLContainer.css({'width':win_width+"px"});
		}

		this._blockLeftArrow = false;
		this._blockRightArrow = false;

		if(this.settings.directionNav) {
			this._TLWrapper.after('<a href="javascript://" class="arrow-wrap left"><span class="arrow-icon left"></span></a> <a href="javascript://" class="arrow-wrap right"><span class="arrow-icon right"></span></a>');
			this.arrowLeft = this.TLRoot.find('.arrow-wrap.left');
			this.arrowRight = this.TLRoot.find('.arrow-wrap.right');
			this.arrowLeft.click(function(e) {
				e.preventDefault();
				if(!self._blockLeftArrow) self.prevPage();
			});
			this.arrowRight.click(function(e) {
				e.preventDefault();
				if(!self._blockRightArrow) self.nextPage();
			});

			if(this.settings.keyboard) {
				$(document).bind("keydown.taogi", function(e) {
					if (e.keyCode === 37) {
						if(!self._blockLeftArrow) self.prevPage();
					}
					else if (e.keyCode === 39) {
						if(!self._blockRightArrow) self.nextPage();
					}
   			 });
			}
			self._enableArrow();
		}

		self.updateTLSize(false);

		if(self.settings.useToggleContainer && self.settings.ToggleContainer) {
			self.toggleContainer();
		}

		var swipeOptions=
		{
			triggerOnTouchEnd : this.settings.triggerOnTouchEnd,
			swipeStatus : swipeStatus,
			click: swipeClick,
			allowPageScroll : this.settings.allowPageScroll,
			threshold : this.settings.threshold,
			excludedElements : this.settings.excludedElements,
			fingers:2
		}

		this._TLContainer.bind('click',function(event) {
			self._OnClick(event);
		});
		this._TLContainer.swipe(swipeOptions);

		function swipeStatus(event,phase,direction,distance,duration,fingers) {
			if( phase == "start" ) {
				self._onSwipeStart(event);
			} else if( phase == "move" ) {
				self._onSwipeMove(direction,distance,duration);
			} else if( phase == "cancel" ) {
				self._onSwipeEnd(event,phase,direction,distance,duration);
			} else if( phase == "end" ) {
				self._onSwipeEnd(event,phase,direction,distance,duration);
			}
		}

		function swipeClick(event,obj) {
			self._OnClick(obj);
		}

		jQuery(window).resize(function() {
			self.updateTLSize(true);
		});

		this.lastendPos = 0;
		if(window.location.hash) {
			var _hash = window.location.hash;
			self.moveToHash(_hash.substring(1));
		}
		this.scrollMode = 0;

		self._setSwipeCursor();

		self.createFigure();
	}

	TaogiTouchCarousel.prototype = {

		/*
		 * Functions for TouchCarousel Timeline Container Layout
		 */
		_checkBrowserResolutionScale:function() {
			if(jQuery(window).width() > jQuery(window).height()) return true;
			else return false;
		},

		_bindGnb:function(element) {
			var self = this;
			element.bind('touchstart click',function(e){
				e.preventDefault();
				self.TLFrame.toggleClass('menu-active');
				return false;
			});
		},

		/* touchcarousel container resizing function where window resize event call */
		updateTLSize:function(reBuild) {
			var win_width = jQuery(document).width();
			var win_height = jQuery(document).height();

			var rBuild = 0;
			var curPos = 0;
			this._TLContainer.css({'width':win_width+"px"});
			if(reBuild) {
				rBuild = 1;
				var currPosX=0;
				var before_totalItemWidth = this._totalItemWidth;
				var curPos = this._getXPosition();
				this.min_slide = Math.round(win_width/4)*(-1)
				this.max_slide = Math.round(win_width*1.25);
				var CHeight = 0;
				for(i=0; i<this.items.length; i++) {
					var iwidth = parseInt(this.items[i].item.css('width'));
					if(iwidth > Math.abs(this.min_slide)) this.min_slide = iwidth * (-1.25);
					this.items[i].posX = currPosX;
					this.items[i].width = iwidth;
					this.items[i].item.data('width',iwidth);
					this.items[i].height = this.items[i].item.outerHeight(true);
					if(this.items[i].height > CHeight) CHeight = this.items[i].height;
					if((currPosX + iwidth + curPos) < this.min_slide) {
						this._setIPosition(this.items[i].item,this.min_slide,0);
					} else if(currPosX + curPos > this.max_slide) {
						this._setIPosition(this.items[i].item,this.max_slide,0);
					} else {
						this._setIPosition(this.items[i].item,(currPosX+curPos),0);
					}
					currPosX += this.items[i].width;
				}
				if(rBuild && this._maxXPos != currPosX) {
					this._maxXPos = this._totalItemWidth = currPosX;
					this.sliderMax = Math.max(100,Math.round(this._totalItemWidth / 100));
					this.resizeFigure();
					this.resizeGallery();
				}
			}
			if(this._maxXPos > win_width) {
				this.TLRoot.width(win_width);
			}
			this.tlWidth = this.TLRoot.width();
			if(parseInt(this.items[0].item.css('width')) == this.tlWidth) {
				taogiVMM.master_config.snapToItem = this.snapToItem = true;
			} else {
				taogiVMM.master_config.snapToItem = this.snapToItem = false;
			}
			if(this.settings.directionNav) {
				if(!this._TLWrapper.hasClass('directionNav')) {
					this._TLWrapper.addClass('directionNav');
				}
				var _TLmarginLeft = parseInt(this._TLWrapper.css('margin-left'));
				var _TLmarginRight = parseInt(this._TLWrapper.css('margin-right'));
				this._TLWrapper.width(this.tlWidth - _TLmarginLeft - _TLmarginRight);
			}
			this.tlcWidth = this._TLWrapper.width();
			if(rBuild) {
				this.snapPage();
			}

			if(this.settings.scrollbar) {
				this.createSlidebar();
				if(typeof(this.active_indexer) == 'undefined') {
					this.curr_indexer = 0;
					this._setIndicate(1);
				}
			} else {
				this.settings.scrollbar = false;
			}
		},

		/* functions for enabling or disabling moving arrow on touchcarousel */
		_disableArrowLeft:function() {
			if(!this.arrowLeft.hasClass('disabled')) {
				this.arrowLeft.addClass('disabled');
			}
			this._blockLeftArrow = true;
		},

		_disableArrowRight:function() {
			if(!this.arrowRight.hasClass('disabled')) {
				this.arrowRight.addClass('disabled');
			}
			this._blockRightArrow = true;
		},

		_disableArrow:function() {
			this._disableArrowLeft();
			this._disableArrowRight();
		},

		_enableArrow:function() {
			var pos = this._getXPosition();
			if(pos < 0) {
				this.arrowLeft.removeClass('disabled');
				this._blockLeftArrow = false;
			}
			if(pos > (this._totalItemWidth-this.tlcWidth)*(-1)) {
				this.arrowRight.removeClass('disabled');
				this._blockRightArrow = false;
			}
		},

		/*
		 * Function required to swipe event
		 */

		_setSwippingCursor:function() {
			if(!this.hasTouch && this.settings.swipeUsingMouse) {
//				var ua = $.browser;
				var Cursor;
				if(taogiVMM.Browser.browser == "Explorer" || taogiVMM.Browser.browser == "Opera") Cursor = "move";
				else if(taogiVMM.Browser.browser == "Mozilla") Cursor = "-moz-grabbing";
				if(Cursor) {
					this._TLContainer.css('cursor',Cursor);
				} else {
					this._TLContainer.removeClass('swipe-cursor');
					this._TLContainer.addClass('swipping-cursor');
				}
			}
		},

		_setSwipeCursor:function() {
			if(!this.hasTouch && this.settings.swipeUsingMouse) {
				var Cursor;
				if(taogiVMM.Browser.browser == "Explorer" || taogiVMM.Browser.browser == "Opera") Cursor = "move";
				else if(taogiVMM.Browser.browser == "Mozilla") Cursor = "-moz-grab";
				if(Cursor) {
					this._TLContainer.css('cursor',Cursor);
				} else {
					this._TLContainer.removeClass('swipping-cursor');
					this._TLContainer.addClass('swipe-cursor');
				}
			}
		},

		/* stop swipping */
		_stopSwipping:function(event) {
			if(this._onSwipping)
				this._onSwipping.stop();
			this._isSwipping = false;
		},

		_onSwipeStart:function(event) {
			var cE = jQuery(event.target).closest( this.settings.clickElements );
			if(cE.length>0 ) {
				if(cE.hasClass('thumbnail')) {
					this.moveToGallery(cE.attr('item-index'),cE.attr('g-index'),this.settings.transitionSpeed,'ease-out');
				}
			}
			this._stopSwipping(event);
			this._startPos = this._getXPosition();
			this._setSwippingCursor();
			this._isSwipping = true;
		},

		_onSwipeMove:function(direction,distance,duration) {
			if(direction == "left") {
				var dist = this._startPos - distance;
			} else if(direction == "right") {
				var dist = this._startPos + distance;
			}
			if(dist) this._setXPosition(dist,0);
		},

		_onSwipeEnd:function(event,phase,direction,distance,duration) {
			this.lastendPos = this._getXPosition();
			this._setSwipeCursor();

			if(direction == 'up' || direction == 'down') {
				if(this._isSliderSwipping != true) {
					var obj = jQuery(event.target).closest('.touchcarousel-item');
					if(!obj.hasClass('cover-title') && !obj.hasClass('noMedia')) {
						this.switchGallery(obj,this.settings.fingerSwitchGalleryMethod,direction);
						this._initGallery(obj.data('index'));
					}
				}
			} else if(distance) {
				var friction = 0.5,
					mass = 2,
					v = Math.abs(distance) / (duration);

				var timeOffset = 0;
				if(v < 1) {
					friction = this.Friction * 10;
				} else if(v <= 2) {
					friction = this.Friction * 3;
					timeOffset = 0;
				} else if(v > 2 && v <= 3) {
					friction = this.Friction * 3.5;
					timeOffset = 200;
				} else if(v > 3) {
					if(v > 4) {
						v = 4;
						timeOffset = 400;
					}
					friction = this.Friction * 4;
				}

				/* S(migration length) = Caculate Kinetic Energy / Friction Force */
				var S = (v * v * mass) / (2 * friction);
				if(direction == 'left') S = S * -1;
				/* t(time) = S/(2*v) */
				var t = v * mass / friction + timeOffset;
				/* fetch for slow moving event */
				if(v < 0.95 ) {
					S = t = 0;
				}
				if(this.snapToItem === false) {

					var lastendPos = this.lastendPos;
					var maxPos = this._totalItemWidth-this.tlcWidth;

//					var easing = (this.hasTouch || this._useWebkitTransition) ? 'ease-out' : $.cssEase['easeOutCubic'];
					var easing = 'easeOutCubic';

					if(lastendPos + S > 0) {
						if(lastendPos > 0) {
							this.animateTo(0, 800, easing);
						} else {
							this.animateTo(
								(this.tlcWidth / 10) * ((timeOffset + 200) / 1000),
								(Math.abs(lastendPos) * 1.1) / v,
								easing,
								true,
								0,
								400,
								'easeOutCubic');
						}
					} else if(lastendPos + S < maxPos*(-1)) {
						if(lastendPos < maxPos*(-1)) {
							this.animateTo(maxPos*(-1), 800, easing);
						} else {
							this.animateTo(
								((this.tlcWidth / 10) * ((timeOffset + 200) / 1000)) - maxPos,
								(Math.abs(maxPos+lastendPos) * 1.1) / v,
								easing,
								true,
								maxPos*(-1),
								400,
								'easeOutCubic');
						}
					} else {
						this.animateTo(lastendPos + S, t, easing);
					}
				} else {
					if(v >= 0.45) {
						if(direction == 'left') this.nextPage((this.settings.transitionSpeed / 2));
						else this.prevPage((this.settings.transitionSpeed / 2));
					} else {
						this.snapPage();
					}
				}
			}

			this._isSwipping = false;
		},

		_OnClick:function(obj) {
			var cE = jQuery(obj).closest( this.settings.clickElements );
			if(cE.length>0 ) {
				if(cE.hasClass('thumbnail')) {
					this.moveToGallery(cE.attr('item-index'),cE.attr('g-index'),this.settings.transitionSpeed,'ease-out');
				} else if(cE.hasClass('taogi_buildGallery')) {
					var i = parseInt(cE.attr('index'));
					this.buildGallery(this.figures[i].item_index,this.figures[i].figure_index);
				} else if(cE.tagName == 'a') {
					window.open(cE.attr('href'),'_blank');
				}
			}
		},

		/*
		 * Function for set X position or get X positon of TouchCarousel's container
		 *	or Function for animating where swip moving event call or moving by indexer
		 */
		_getXPosition:function() {
			var obj = this._TLContainer;
			var value = parseInt(obj.attr('data-XPos'));
			if(!value) value = 0;
			return value;
//			return Math.round(obj.position().left);
		},

		_getOPosition:function(obj) {
			var p = obj.data('XPos');
			if(p == undefined) {
				if(this._useWebkitTransition) {
					var transform = obj.css(this.supports.transform);
					if(transform && transform != 'none') {
						var explodedMatrix = transform.replace(/^matrix\(/i, '').split(/, |\)$/g);
						return parseInt(explodedMatrix[4], 10);
					}
				}
				return Math.round(obj.position().left);
			} else {
				return p;
			}
		},

		_setXPosition:function(pos,duration,easing,callback) {
			if(duration) {
				var v = (pos - this._getXPosition()) / duration;
			} else {
				var v = 0;
			}
			this._TLContainer.attr('data-XPos',pos);
			if(v <= 0) {
				for(var i=0; i<this.items.length; i++) {
					this._setIPosition(this.items[i].item,(pos + this.items[i].posX),duration,v,'linear');
				}
			} else if(v > 0) {
				for(var i=this.items.length-1; i >= 0; i--) {
					this._setIPosition(this.items[i].item,(pos + this.items[i].posX),duration,v,'linear');
				}
			}
			this.moveProcessBar(pos,duration);
		},

		_setIPosition:function(item,pos,duration,v,easing) {
			var self = this;
			var value = (pos<0 ? "-" : "+") + Math.abs(pos).toString();
			var cur = this._getOPosition(item);
			var skip = 0;
			if(cur == undefined) cur = 0;
			if(pos <= this.min_slide && cur <= this.min_slide) return;
			if(pos >= this.max_slide && cur >= this.max_slide) return;
			if(this.hasTouch || this._useWebkitTransition) {
				var transition = this.supports.transition;
				if(duration && !skip) {
					item.css(transition, (this.supports.transform)+" "+duration.toFixed(1)+"ms "+(easing ? easing : "ease-out"));
				} else {
					item.css(transition, (this.supports.transform)+" 0s linear");
				}
				item.css((self.supports.transform), "translate3d("+value +"px,0px,0px)");
				if(duration && !skip) {
					var transitionEnd = self.supports.transitionEnd+".taogi";
					item.bind(transitionEnd,function() {
						jQuery(this).data('XPos',pos);
						jQuery(this).unbind(transitionEnd);
					});
				} else {
					item.data('XPos',pos);
				}
			} else {
				item.data('XPos',pos);
				item.css('left',value+'px');
			}
		},

		_getXPosByItem:function(id) {
			var item = this.items[id];
			var moveToX = -item.posX + Math.max(0,parseInt((this.tlcWidth - item.width)/2));
			if(moveToX > 0) {
				if(this._TLmarginLeft != 'undefined' && this._TLmarginLeft) moveToX = this._TLmarginLeft;
				else moveToX = 0;
			} else if(moveToX < (this._totalItemWidth-this.tlcWidth)*(-1)) {
				moveToX = (this._totalItemWidth-this.tlcWidth)*(-1);
			}
			return moveToX;
		},

		moveTo:function(id,duration,easing,animateSkip) {
			var item = this.items[id];
			if(item) {
				var moveToX = this._getXPosByItem(id);
				this.curr_indexer = id;
				if(typeof(moveToX) != 'undefined') {
					if(this.hasTouch) easing = "easeOutCubic";
					if(animateSkip == true) {
						this._setXPosition(moveToX,((parseInt(duration) > 0) ? duration : this.settings.transitionSpeed),(easing ? easing : "easeOutCubic"));
					} else {
						this.animateTo(moveToX,((parseInt(duration) > 0) ? duration : this.settings.transitionSpeed),(easing ? easing : "easeOutCubic"));
					}
				}
			}
		},

		moveToHash:function(hash) {
			var goToID = 0;
			if(hash) {
				for(var i=0; i<this.items.length; i++) {
					if(this.items[i].id == hash) {
						goToID = i;
						break;
					}
				}
				if(goToID) this.moveTo(goToID);
			}
		},

		animateTo:function(pos, speed, easing, bounceAnim, endPos, bounceSpeed, bounceEasing) {
			this._stopSwipping();
			this._disableArrow();

			var self = this;
			var from = {containerPos: this.lastendPos},
				to = {containerPos: pos},
				to2 = {containerPos: endPos},
				endPos = bounceAnim ? endPos : pos;

			this._isSwipping = true;
			this._isAnimating = true;

			function swipeComplete() {
				self._isSwipping = false;
				self._enableArrow();
				self.lastendPos = self._getXPosition();
				self._isAnimating = false;
				if(self.scrollMode) self.scrollMode = 0;
			}

			var cur = performance.now();
			var animateStep = 0;
			self._onSwipping = jQuery(from).animate(to, {
				duration: speed,
				easing: easing,
				step: function() {
					self._setXPosition(Math.round(this.containerPos),0);
					animateStep++;
				},
				complete: function() {
					if(bounceAnim) {
						self._onSwipping = jQuery(to).animate(to2, {
							duration: bounceSpeed,
							easing: bounceEasing,
							step: function() {
								var o_cur = cur;
								var cur = performance.now();
								self._setXPosition(Math.round(this.containerPos),(cur - o_cur));
							},
							complete: function() {
								self._setXPosition(Math.round(this.containerPos),0);
								swipeComplete();
							}
						});
					} else {
						self._setXPosition(Math.round(this.containerPos),0);
						swipeComplete();
					}
				}
			});
		},

		_getItemByPosition:function(pos) {
			var self = this;
			pos = -pos;

			var item;
			for(var i=0; i < self.items.length; i++) {
				var item = self.items[i];
				if(pos >= item.posX && (pos < item.posX + item.width)) {
					return item;
				}
			}
			return -1;
		},

		prevPage:function(duration) {
			if(this.active_indexer) var new_index = this.active_indexer - 1;
			else var new_index = 0;
			if(new_index <= 0) new_index = 0;

			this.moveTo(new_index,(parseInt(duration) > 0 ? parseInt(duration) : 0),'',true);
		},

		nextPage:function(duration) {
			if(this.active_indexer && this.curr_indexer > 0) var new_index = this.active_indexer + 1;
			else var new_index = 1;
			if(new_index > (this.items.length - 1)) new_index = this.items.length - 1;

			this.moveTo(new_index,(parseInt(duration) > 0 ? parseInt(duration) : 0),'',true);
		},

		snapPage:function() {
			var self = this;
			if(this.active_indexer) var new_index = this.active_indexer;
			else var new_index = 0;
			this.moveTo(new_index,(this.settings.transitionSpeed / 2));
		},

		/*
		 * Function for timeline indexer slidebar
		 */
		createSlidebar:function() {
			var self = this;

			if(jQuery('.taogi-scrollbar-container').length < 1) {
				this.scrollContainer = jQuery('<div class="taogi-scrollbar-container"><div class="taogi-scrollbar-container-switch"></div><div class="taogi-scrollbar-wrap '+this.settings.scrollbar_thmeme+'"><div class="taogi-scrollbar"></div></div></div>');
				this.scrollContainer.appendTo(this.TLRoot);
				jQuery(this.settings.Smarkup.replace(/taogi\-timeline\-title/,'taogi-timeline-title-minion')).prependTo(this.scrollContainer);
				this._bindGnb(self.scrollContainer.find('.taogi-gnb-switch a'));
				var reBuild = 0;
				this.scrollContainer.find('.taogi-scrollbar-container-switch').bind('touchstart click',function(e) {
					self._toggleIndicate();
				});
			} else {
				this.scrollContainer = jQuery('.taogi-scrollbar-container');
				var reBuild = 1;
			}
			this.scrollContainerPos = parseInt(this.scrollContainer.css('bottom'));
			this.scrollbarWrap = this.scrollContainer.find('.taogi-scrollbar-wrap');
			this.scrollbar = this.scrollContainer.find('.taogi-scrollbar');

			var _date = {};
			for(i=0; i<this.items.length; i++) {
				if(this.items[i].isCover == true) continue;
				var pdate = this.items[i].item.find('.pubdate').text();
				if(pdate) {
					_date.startdate = taogiVMM.Date.parse(pdate);
					_date.full_startdate		= _date.startdate.getTime();
					break;
				}
			}
			for(i=this.items.length-1; i>=0; i--) {
				var pdate = this.items[i].item.find('.pubdate').text();
				if(pdate) {
					_date.enddate = taogiVMM.Date.parse(pdate);
					_date.full_enddate			= _date.enddate.getTime();
					break;
				}
			}
			_date.full_period			= _date.full_enddate - _date.full_startdate;

			if(!reBuild) {
				this.slidebar_division = jQuery('<ul class="taogi-scrollbar-nodes"></ul>');
				this.slidebar_division.appendTo(this.scrollbar);
				/* IE 8 border-radius patch */
				var slidebar_process = jQuery('<div class="taogi-scrollbar-indicator"><div class="taogi-scrollbar-indicator-bar"></div></div>');
				slidebar_process.appendTo(this.scrollbar);
				this.slidebar_processBar = slidebar_process.find('.taogi-scrollbar-indicator-bar');
				this.slidebar_pointer = jQuery('<div class="taogi-scrollbar-pointer"><div class="taogi-scrollbar-tooltip"><span class="date"></span><span class="split">_</span><span class="label"></span></div><div class="taogi-scrollbar-marker" href="javascript://"><span></span></div></div>');
				this.slidebar_pointer.appendTo(this.scrollbar);
			} else {
				this.slidebar_division = this.scrollbar.find('ul.taogi-scrollbar-nodes');
				this.slidebar_processBar = this.scrollbar.find('.taogi-scrollbar-indicator-bar');
				this.slidebar_pointer = this.scrollbar.find('.taogi-scrollbar-pointer');
			}
			this.slidebar_width = this.slidebar_division.width();
			this.slidebar_division_offset = this.scrollbar.position().left;
			this.slidebar_division_left = this.scrollbar.offset().left;
			this.pointer_marker_width = this.slidebar_pointer.find('taogi-scrollbar-marker').width();

			var cur_pos = 0, pre_pos = 0;
			var _l_class = 0;
			for(i=0; i<this.items.length; i++) {
				if(this.items[i].isCover == true) continue;
				var _pub_date = this.items[i].item.find('.pubdate').text();
				_date.curdate = taogiVMM.Date.parse(_pub_date);
				_date.full_curdate = _date.curdate.getTime();
				cur_pos = parseInt((_date.full_curdate - _date.full_startdate) / _date.full_period * this.slidebar_width);
				if(cur_pos <= pre_pos) cur_pos = pre_pos + 1;
				if(!reBuild) {
					var item_index = jQuery('<li rel="'+i+'" attr-pubdate="'+_pub_date+'" attr-headline="'+this.items[i].item.find('h2.title').text()+'" class="taogi-scrollbar-node"><a href="javascript://"><span>'+this.items[i].item.find('h2.title').text()+'</span></a></li>');
				} else {
					var item_index = jQuery('li[rel="'+i+'"]');
				}
				this.items[i].slidePos = (cur_pos-parseInt(item_index.outerWidth(true)/2));
				item_index.css({'left':this.items[i].slidePos+'px'});
				if(!reBuild) {
					item_index.appendTo(this.slidebar_division);
					item_index.find('a').click(function(e) {
						e.preventDefault();
						var indexer = jQuery(this).parent().attr('rel');
						self._setIndicate(indexer);
						self.scrollMode = 1;
						self.moveTo(indexer);
					});
					this.items[i].indexer = item_index;
				}
				pre_pos = cur_pos;
			}
			this.slidebar_division.find('li').each(function() {
				self.items[parseInt(jQuery(this).attr('rel'))].i_indexer = jQuery(this).offset().left;
			});

			var indexer_swipeOptions=
			{
				triggerOnTouchEnd : this.settings.triggerOnTouchEnd,
				swipeStatus : indexerStatus,
				allowPageScroll : this.settings.allowPageScroll,
				threshold : this.settings.threshold,
				excludedElements : this.settings.excludedElements,
				fingers:2
			}

//			this.scrollbar.swipe(indexer_swipeOptions);
			this.scrollbarWrap.swipe(indexer_swipeOptions);

			function indexerStatus(event,phase,direction,distance,duration,fingers) {
				if( phase == "start" ) {
					self._onSliderStart(event);
				} else if( phase == "move" ) {
					self._onSliderMove(event,direction,distance,duration);
				} else if( phase == "cancel" ) {
					self._onSliderEnd(event,phase,direction,distance,duration);
				} else if( phase == "end" ) {
					self._onSliderEnd(event,phase,direction,distance,duration);
				}
			}
		},

		moveProcessBar:function(pos,duration) {
			var max_p = -this.items[this.items.length-1].posX + this.tlWidth - this.items[this.items.length-1].width;
			if(this._isSliderSwipping == false) {
				if(pos <= max_p) {
					this.curr_indexer = this.items.length-1;
					this._setIndicate(this.items.length-1);
				} else if(pos < 0) {
					var idx = this._getClosestIndexerByX(pos);
					var c_pos = this._snapPosOfItem(idx);
					if(c_pos < pos) {
						var pc_pos = this._snapPosOfItem(idx-1);
						var w = Math.round((pc_pos - pos) * (this.items[idx].slidePos - this.items[idx-1].slidePos) / this.items[idx-1].width) + this.items[idx-1].slidePos;
					} else if(c_pos > pos) {
						if(typeof(this.items[idx+1].slidePos) == 'undefined' || !this.items[idx+1].slidePos) {
							var w = this.items[idx].slidePos;
						} else {
							var w = Math.round((c_pos - pos)*(this.items[idx+1].slidePos - this.items[idx].slidePos) / this.items[idx].width) + this.items[idx].slidePos;
						}
					} else {
						var w = this.items[idx].slidePos;
					}
					this._setIndicatePos(w,duration);
					this._setIndicate(idx,true);
				} else {
					this.curr_indexer = 0;
					this._setIndicate(1);
				}
			}
		},

		_onSliderStart:function(event) {
			if(this._isIndicateSwipping == true) return;
			this._stopSwipping();
			this._startSPos = (event.pageX ? event.pageX : event.touches[0].pageX) - this.slidebar_division_left;
			this._startPos = this._getXPosByProcessBar(event);
			this._isSliderSwipping = true;
			this._setIndicatePos(this._startSPos,0);
			this._setXPosition(this._startPos,0);
			this._isSwipping = true;
		},

		_onSliderMove:function(event,direction,distance,duration) {
			if(this._isSliderSwipping == true && this._isIndicateSwipping == false) {
				var sdist = 0;
				if(direction == "left") {
					sdist = this._startSPos - distance;
				} else if(direction == "right") {
					sdist = this._startSPos + distance;
				}
				if(sdist) {
					var dist = this._getXPosByProcessBar(event);
					this._setIndicatePos(sdist,0);
					this._setXPosition(dist,0);
				}
			}
		},

		_onSliderEnd:function(event,phase,direction,distance,duration) {
			if(this._isSliderSwipping == true) {
				this._isSliderSwipping = false;
				this._isSwipping = false;
				this.lastendPos = this._getXPosition();

				var s_width = this.slidebar_processBar.width() + this.slidebar_division_left;
				if(s_width < this.slidebar_division_left) s_width = this.slidebar_division_left;
				else if(s_width > (this.slidebar_width + this.slidebar_division_left)) s_width = this.slidebar_width + this.slidebar_division_left;
				var r1 = this.getClosestIndexer(s_width);
				this.moveTo(r1,500);
			} else if(this.snapToItem === true && distance) {
				if(direction == 'up')
					this._showIndicate(1);
				else if(direction == 'down')
					this._showIndicate(0);
			}
		},

		_toggleIndicate:function() {
			if(this.scrollContainer.data('show') == 1) {
				this._showIndicate(0);
			} else {
				this._showIndicate(1,(taogiVMM.Browser.device != 'desktop' ? this.settings.transitionSpeed : 0));
			}
		},

		_showIndicate:function(show_opt,delay) {
			var self = this;
			var transition = this.supports.transition.toLowerCase();
			var transform = this.supports.transform.toLowerCase();
			var transitionEnd = this.supports.transitionEnd;
			if(this.scrollContainerPos) {
				if(show_opt == 1) {
					if(this._useWebkitTransition === true) {
						this._isIndicateSwipping = true;
						this.scrollContainer.css({transition: transform+' '+(this.settings.transitionSpeed/3).toFixed(1)+'ms '+$.cssEase['easeOutCubic']+(delay ? ' '+delay.toFixed(1)+'ms' : ''), transform: 'translate3d(0,'+self.scrollContainerPos+'px,0)'});
						this.scrollContainer.bind(transitionEnd, function() {
							self.scrollContainer.data('show',1);
							self.scrollContainer.addClass('active');
							self._isIndicateSwipping = false;
							self.scrollContainer.unbind(transitionEnd);
						});
					} else {
						this.scrollContainer.css('bottom',0);
						this.scrollContainer.addClass('active');
						this.scrollContainer.data('show',1);
					}
				} else {
					if(this._useWebkitTransition === true) {
						this._isIndicateSwipping = true;
						this.scrollContainer.css({transition: transform+' '+$.cssEase['easeOutCubic']+' '+(this.settings.transitionSpeed/3).toFixed(1)+'ms', transform: 'translate3d(0,0,0)'});
						this.scrollContainer.bind(transitionEnd, function() {
							self.scrollContainer.data('show',0);
							self.scrollContainer.removeClass('active');
							self._isIndicateSwipping = false;
							self.scrollContainer.unbind(transitionEnd);
						});
					} else {
						this.scrollContainer.css('bottom',this.scrollContainerPos+'px');
						this.scrollContainer.removeClass('active');
						this.scrollContainer.data('show',0);
					}
				}
			}
		},

		_setIndicate:function(rel,progressBar_opt) {
			if(typeof(progressBar_opt) == 'undefined') progressBar_opt = false;
			if(!this.settings.scrollbar) return;
			if(this.active_indexer != rel) {
				this.active_indexer = rel;
				var rrel = (rel >= this.totalItemCnt ? this.totalItemCnt : rel)
				if(progressBar_opt == false) {
					var s_width = parseInt(this.scrollbar.find('li[rel="'+rrel+'"]').css('left'));
					this._setIndicatePos(s_width,0);
				}
				var sl = this.scrollbar.find('li[rel="'+rrel+'"]');
				this.slidebar_pointer.find('.date').text(sl.attr('attr-pubdate'));
				this.slidebar_pointer.find('.label').text(sl.attr('attr-headline'));
				var tooltip = this.slidebar_pointer.find('.taogi-scrollbar-tooltip');
				if(rrel < this.totalItemCnt) {
					var cl = parseInt(sl.css('left'));
					var max_l = cl+Math.round((parseInt(sl.next().css('left')) - cl) / 2);
				} else {
					var max_l = parseInt(sl.next().css('left'));
				}
				var w = tooltip.outerWidth()+parseInt(tooltip.css('left'))+max_l;
				var transition = this.settings.transition;
				var transform = this.settings.transform;
				if(this._useWebkitTransition) {
					if(w > this.slidebar_width) {
						tooltip.css({transition: transform+' 500ms ease', transform: 'translate3d('+(this.slidebar_width - w)+'px,0,0)'});
					} else {
						tooltip.css({transition: transform+' 500ms ease', transform: 'translate3d(0,0,0)'});
					}
				}
			}
		},

		_setIndicatePos:function(width,duration) {
			var w = width - Math.round(this.pointer_marker_width/2);
			if(this._useWebkitTransition) {
				var transition = this.supports.transition;
				var transform = this.supports.transform;
				if(parseInt(duration) > 0) var dr = duration;
				else dr = 0;
				this.slidebar_pointer.css({transition : transform+' '+(parseInt(duration) > 0 ? duration.toFixed(1) : 0)+'ms', transform : 'translate3D('+w+'px,0,0)'});
				this.slidebar_processBar.css({transition : "width "+(parseInt(duration) > 0 ? duration : 0)+"ms", 'width': ((width > this.slidebar_division_offset) ? width+'px' : '0')});
			} else {
				this.slidebar_pointer.css('left',((width > this.slidebar_division_offset) ? w : 0)+'px');
				this.slidebar_processBar.width((width > this.slidebar_division_offset) ? width : 0);
			}
			for(var i=1; i<=this.totalItemCnt; i++) {
				if(parseInt(this.items[i].indexer.css('left')) < w) {
					this.items[i].indexer.addClass('past');
				} else {
					this.items[i].indexer.removeClass('past');
				}
			};
		},

		_setProcessBarWidth:function(width,duration) {
			if(this._useWebkitTransition) {
				var transition = this.supports.transition;
				this.slidebar_processBar.css({transition : "width "+duration+"ms", 'width': ((width > this.slidebar_division_offset) ? width+'px' : '0')});
			} else {
				this.slidebar_processBar.width((width > this.slidebar_division_offset) ? width : 0);
			}
		},

		_getXPosByProcessBar:function(event) {
			var s_width = (event.pageX ? event.pageX : event.touches[0].pageX);
			if(s_width < this.slidebar_division_left) s_width = this.slidebar_division_left;
			else if(s_width > (this.slidebar_width + this.slidebar_division_left)) s_width = this.slidebar_width + this.slidebar_division_left;
			var r1 = this.getClosestIndexer(s_width);
			var l1 = this.items[r1].i_indexer;
			var p1 = this._getXPosByItem(r1);
			if(l1 > s_width) {
				if(r1 > 0) {
					var r2 = r1 - 1;
					var l2 = this.items[r2].i_indexer;
					var p2 = this._getXPosByItem(r2);
					var xPos = p2 + parseInt(((s_width - l2) / (l1 - l2)) * (p1 - p2));
					this._setIndicate(r2,true);
				} else {
					var xPos = 0;
					this._setIndicate(r1,true);
				}
			} else if(l1 < s_width) {
				if(r1 < this.items.length-1) {
					var r2 = r1 +1;
					var l2 = this.items[r2].i_indexer;
					var p2 = this._getXPosByItem(r2);
					var xPos = p1 + parseInt(((s_width - l1) / (l2 - l1)) * (p2 - p1));
				} else {
					var xPos = (this._totalItemWidth-this.tlcWidth)*(-1);
				}
				this._setIndicate(r1,true);
			} else {
				var xPos = p1;
				this._setIndicate(r1,true);
			}
			return xPos;
		},

		getClosestIndexer:function(value) {
			var lo = 1, hi = this.items.length-1;
			while(hi - lo > 1) {
				var mid = Math.round((lo + hi)/2);
				if (this.items[mid].i_indexer <= value) {
					lo = mid;
				} else {
					hi = mid;
				}
			}
			if(lo == hi) return lo;
			else if(Math.abs(this.items[lo].i_indexer - value) <= Math.abs(this.items[hi].i_indexer - value))
				return lo;
			else
				return hi;
		},

		_getClosestIndexerByX:function(value) {
			var lo = 1, hi = this.items.length-1;
			while(hi - lo > 1) {
				var mid = Math.round((lo + hi)/2);
				var pos = this._minPosIndexerOfItem(mid);
				if(value > pos)
					hi = mid;
				else
					lo = mid;
			}
			return lo;
		},

		_minPosIndexerOfItem:function(i) {
			var item = this.items[i];
			if(!i) return 0;
			if(this.snapToItem === true) {
				return (Math.round(this.tlcWidth / 2) - item.posX);
			} else {
				if(item.posX + item.width <= Math.round(this.tlcWidth/4)) {
					return (Math.round(this.tlcWidth/16) - item.posX);
				} else if(item.posX + item.width <= Math.round(this.tlcWidth/2)) {
					return (Math.round(this.tlcWidth/8) - item.posX);
				} else {
					return (Math.round(this.tlcWidth/2) - item.posX);
				}
			}
		},

		_snapPosOfItem:function(i) {
			var item = this.items[i];
			if(!i) return 0;
			if(this.snapToItem === true) {
				return ((-1)*item.postX);
			} else {
				return (Math.round((this.tlcWidth - item.width) / 2) - item.posX);
			}
		},

		/*
		 * Function for create multimedia element of each timeline items
		 */
		/* Build multimedia by taogiVMM(using each API) */
		createFigure:function() {
			var self = this;
			var m;
			var mediaElem;
			for(var i=0; i< this.figures.length; i++) {
				var item = this.figures[i];
				mediaElem = '';
				m = taogiVMM.ExternalAPI.MediaType(item.url);
				m.url = item.url;
				m.uid = item.uid;
				m.caption = item.caption;
				m.thumbnail = item.thumbnail;
				m.use_proxy = item.use_proxy;
				m.use_thumb_proxy = item.use_thumb_proxy;
				m.thumb = item.thumb;
				if(this._useWebkitTransition == true) {
					m.wmode = 'transparent';
				} else {
					m.wmode = 'window';
				}
				this.figures[i].m = m;

				mediaElem = this.createFigureElement(m,item);
				if(mediaElem) {
					if(m.type == 'image' || m.type == 'instagram') {
						taogiVMM.alignattachElement('#'+m.uid, mediaElem, '#'+m.uid+(m.thumb ? ' .feature_image' : ''), (m.thumb ? 1 : 0));
					} else {
						taogiVMM.attachElement('#'+m.uid,mediaElem);
					}
				}
			}
			/* if has no youtube element at first page, but has youtube element at media gallery mode then load youtube api previously */
			taogiVMM.ExternalAPI.pushQues();
		},

		createFigureElement:function(m,item) {
			var self = this;
			var mediaElem = '';
			var loading_message = loadingmessage("Loading...");
			if(m.type == "image") {
				if(m.thumb) jQuery('#'+m.uid).addClass('thumb-image taogi_buildGallery');
				else jQuery('#m'+m.uid).addClass('image');
				if(m.use_proxy) {
					m.id = './library/api.php?type=proxy&taogiauth=ACA20D8B4F7B63D8639C7824AC458D3A53F7E275&skip_referer=1&url='+encodeURIComponent(m.id);
				}
				mediaElem = "<img src='"+m.id+"' class='feature_image' />";
				if(item.credit) mediaElem += "<h5 class='caption'>"+item.caption+"</h5>";
			} else if(m.type == "flickr") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-flickr taogi_buildGallery' : 'flickr')).html(loading_message);
				taogiVMM.ExternalAPI.flickr.get(m);
			} else if(m.type == "instagram") {
				jQuery('#'+m.uid).addClass('taogi_buildGallery');
				mediaElem = "<img src='"+taogiVMM.ExternalAPI.instagram.get(m)+"' class='feature_image' />";
				if(item.credit) mediaElem += "<h5 class='caption'>"+item.caption+"</h5>";
			} else if(m.type == "youtube") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-youtube taogi_buildGallery taogi-icon-player' : 'youtube'));
				vw = this.resolutionOfVideo(m);
				m.width = vw.width;
				m.height = vw.height;
				taogiVMM.appendElement('#'+m.uid,'<div id="'+m.uid+'_youtube" style="width:'+m.width+'px;height:'+m.height+'px;"></div>');
				taogiVMM.attachElement('#'+m.uid+'_youtube',loading_message);
				taogiVMM.ExternalAPI.youtube.get(m);
			} else if(m.type == "googledoc") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-googledoc taogi_buildGallery' : 'googledoc')).html(loading_message);
				taogiVMM.ExternalAPI.googledocs.get(m);
			} else if(m.type == "vimeo") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-vimeo taogi_buildGallery taogi-icon-player' : 'vimeo')).html(loading_message);
				m.width = this.resolutionOfVideo(m);
				taogiVMM.ExternalAPI.vimeo.get(m);
			} else if(m.type == "vine") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-vine taogi_buildGallery taogi-icon-player' : 'vine')).html(loading_message);
				m.width = this.resolutionOfVideo(m);
				taogiVMM.ExternalAPI.vine.get(m);
			} else if(m.type == "dailymotion") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-dailymotion taogi_buildGallery taogi-icon-player' : 'dailymotion')).html(loading_message);
				taogiVMM.ExternalAPI.dailymotion.get(m);
			} else if(m.type == "twitter") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-' : '')+'twitter').html(loading_message);
				taogiVMM.ExternalAPI.twitter.get(m);
			} else if(m.type == "twitter-ready") {
				jQuery('#'+item.id).addClass('textMedia');
				mediaElem = m.id;
			} else if(m.type == "soundcloud") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-soundcloud taogi_buildGallery taogi-icon-player' : 'soundcloud')).html(loading_message);
				taogiVMM.ExternalAPI.soundcloud.get(m);
			} else if(m.type == "google-map") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-googlemap taogi_buildGallery' : 'googlemap')).html(loading_message);
				taogiVMM.ExternalAPI.googlemaps.get(m);
			} else if(m.type == "googleplus") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-googleplus taogi_buildGallery' : 'googleplus')).html(loading_message);
				taogiVMM.ExternalAPI.googleplus.get(m);
			} else if(m.type == "wikipedia") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-' : '')+'wikipedia').html(loading_message);
				taogiVMM.ExternalAPI.wikipedia.get(m);
			} else if(m.type == "rigvedawiki") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-' : '')+'rigvedawiki').html(loading_message);
				taogiVMM.ExternalAPI.rigvedawiki.get(m);
			} else if(m.type == "storify") {
				jQuery('#'+item.id).addClass('textMedia');
				mediaElem = m.uid;
			} else if (m.type == "iframe") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-iframe taogi_buildGallery' : 'iframe')).html(loading_message);
				taogiVMM.ExternalAPI.iframe.get(m);
			} else if (m.type == "mediaelements") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-' : '')+"mediaelements").html(loading_message);
				taogiVMM.ExternalAPI.mediaelements.get(m);
			} else if (m.type == "pdf") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-' : '')+"pdf").html(loading_message);
				taogiVMM.ExternalAPI.pdf.get(m);
			} else if (m.type == "attachment") {
				jQuery('#'+item.uid).addClass((m.thumb ? "thumb-" : "")+'attachment');
				taogiVMM.ExternalAPI.attachment.create(m);

			} else if(m.type == "quote") {
				jQuery('#'+item.uid).addClass((m.thumb ? "thumb-" : "")+'textMedia');
				mediaElem = m.id.replace(/<blockquote>/i,'<blockquote><p>').replace(/<\/blockquote>/i,'</p></blockquote>');
			} else if(m.type == "unknown") {
				jQuery('#'+item.uid).addClass('textMedia');
				mediaElem = "<div class='container'>" + taogiVMM.Util.properQuotes(m.id) + "</div>";
			} else if(m.type == "website") {
				jQuery('#'+m.uid).addClass((m.thumb ? 'thumb-' : '')+'website').html(loading_message);
				taogiVMM.ExternalAPI.webthumb.get(m);
			} else {
				trace("NO KNOWN MEDIA TYPE FOUND");
				trace(m.type);
			}
			return mediaElem;
		},

		resizeFigure:function() {
			for(var i=0; i< this.figures.length; i++) {
				this.resizeFigureElement(this.figures[i].m);
			}
		},

		resizeFigureElement:function(m) {
			var self = this;
			if(m.type == "image" || m.type == 'instagram') {
				taogiVMM.Util.reAlignMiddle('#'+m.uid+(m.thumb ? ' .feature_image' : ''),(m.thumb ? 1 : 0));
			} else if(m.type == "flickr") {
				taogiVMM.ExternalAPI.flickr.resize(m);
			} else if(m.type == "youtube") {
				taogiVMM.ExternalAPI.youtube.resize(m);
			} else if(m.type == "googledoc") {
				taogiVMM.ExternalAPI.googledocs.resize(m);
			} else if(m.type == "vimeo") {
				taogiVMM.ExternalAPI.vimeo.resize(m);
			} else if(m.type == "vine") {
				taogiVMM.ExternalAPI.vine.resize(m);
			} else if(m.type == "dailymotion") {
				taogiVMM.ExternalAPI.dailymotion.resize(m);
			} else if(m.type == "twitter") {
				taogiVMM.ExternalAPI.twitter.resize(m);
			} else if(m.type == "twitter-ready") {
				taogiVMM.Util.reAlignMiddle('#'+m.uid,(m.thumb ? 1 : 0));
			} else if(m.type == "soundcloud") {
				taogiVMM.ExternalAPI.soundcloud.resize(m);
			} else if(m.type == "google-map") {
				taogiVMM.ExternalAPI.googlemaps.resize(m);
			} else if(m.type == "googleplus") {
				taogiVMM.ExternalAPI.googleplus.resize(m);
			} else if(m.type == "wikipedia") {
				taogiVMM.ExternalAPI.wikipedia.resize(m);
			} else if(m.type == "rigvedawiki") {
				taogiVMM.ExternalAPI.rigvedawiki.resize(m);
			} else if(m.type == "storify") {
				taogiVMM.Util.reAlignMiddle('#'+m.uid,(m.thumb ? 1 : 0));
			} else if (m.type == "iframe") {
				taogiVMM.ExternalAPI.iframe.resize(m);
			} else if (m.type == "mediaelements") {
				taogiVMM.ExternalAPI.mediaelements.resize(m);
			} else if (m.type == "pdf") {
				taogiVMM.ExternalAPI.pdf.resize(m);
			} else if (m.type == "attachment") {
				taogiVMM.ExternalAPI.attachment.resize(m);
			} else if(m.type == "quote") {
				taogiVMM.Util.reAlignMiddle('#'+m.uid,(m.thumb ? 1 : 0));
			} else if(m.type == "unknown") {
				taogiVMM.Util.reAlignMiddle('#'+m.uid,(m.thumb ? 1 : 0));
			} else if(m.type == "website") {
				taogiVMM.ExternalAPI.webthumb.resize(m);
			} else {
			}
		},

		resolutionOfVideo:function(m) {
			var v = {};
			v.width = jQuery('#'+m.uid).width();
			v.height = jQuery('#'+m.uid).outerHeight(true);
			var max_width = Math.round(v.height * 16 / 9);
			if(max_width < v.width) v.width = max_width;

			return v;
		},

		/********************************************************
		 * Functions relative to Gallery
		 ********************************************************/
		
		/*
		 * function which create gallery container markup
		 * 	this function called whene user click mutimedia element on touchcarousel
		 */
		initSwitchGallery:function(obj,type) {
			switch(type) {
				case 'hisizon-carousel':
				case 'vertical-carousel':
					break;
				case 'fade':
					this.initFade(obj);
					break;
				case 'horizon-scroll-3d':
				case 'vertical-scroll-3d':
				default:
					this.initScroll3D(obj,type);
					break;
			}
		},

		moveGalleryContainer:function(obj,type,dist) {
			switch(type) {
				case 'hisizon-carousel':
				case 'vertical-carousel':
					this.moveCarousel(obj,type,dist);
					break;
				case 'horizon-scroll-3d':
				case 'vertical-scroll-3d':
				default:
					this.moveScroll3D(obj,type,dist);
					break;
			}
		},

		switchGallery:function(obj,type,direction){
			switch(type) {
				case 'hisizon-carousel':
				case 'vertical-carousel':
					this.activeCarousel(obj,type,direction);
					break;
				case 'fade':
					this.activeFade(obj);
					break;
				case 'horizon-scroll-3d':
				case 'vertical-scroll-3d':
				default:
					if(direction == 'left' || direction == 'down')
						var deg = -180;
					else {
						var deg = 180;
					}
					this.snapScroll3D(obj,type,deg);
					break;
			}
		},

		snapGalleryContainer:function(obj,type) {
			switch(type) {
				case 'hisizon-carousel':
				case 'vertical-carousel':
					break;
				case 'horizon-scroll-3d':
				case 'vertical-scroll-3d':
				default:
					this.snapScroll3D(obj,type);
					break;
			}
		},

		initScroll3D:function(obj,type) {
			var self = this;
			var flipper, article, media;
			var transition = this.supports.transition.toLowerCase();
			var transform = this.supports.transform.toLowerCase();
			if(!obj.hasClass('flipper')) {
				var perspective = this.supports.transition.replace(/transition/i,"perspective").toLowerCase();
				var backface = this.supports.transition.replace(/transition/i,"backface-visibility").toLowerCase();
				var transform_style = this.supports.transform+'-style';
				var container = obj.children('.item-container');
				flipper = container.children('.item-flipper');
				article = flipper.children('.section.article');
				media = flipper.children('.section.media');
				var w = container.width();
				var h = container.height();
				obj.addClass('flipper');
				if(type == 'horizon-scroll-3d') obj.removeClass('vertical').addClass('horizon');
				else if(type == 'vertical-scroll-3d') obj.removeClass('horizon').addClass('vertical');

				flipper.css({'width' : '100%', 'height' : '100%'});
				article.css({'width' : '100%', 'height' : '100%'});
				media.css({'width' : '100%', 'height' : '100%'});
			}
			if(!flipper) flipper = obj.find('.item-flipper');
			if(taogiVMM.Browser.browser == 'Explorer') {
				if(!article) article = flipper.children('.section.article');
				if(!media) media = flipper.children('.section.media');
				article.css(transition, transform+" "+this.settings.transitionSpeed+'ms');
				media.css(transition, transform+" "+this.settings.transitionSpeed+'ms');
			} else {
				flipper.css(transition, transform+" "+this.settings.transitionSpeed+'ms');
			}
			if(type == 'horizon-scroll-3d') {
				if(!obj.hasClass('horizon')) {
					obj.removeClass('vertical').addClass('horizon');
				}
			} else if(type == 'vertical-scroll-3d') {
				if(!obj.hasClass('vertical')) {
					obj.removeClass('horizon').addClass('vertical');
				}
			}
		},

		moveScroll3D:function(obj,type,dist) {
			var transition = this.supports.transition.toLowerCase();
			var transform = this.supports.transform.toLowerCase();
			var flipper = obj.find('.item-flipper');
			this.initScroll3D(obj,type);
			flipper.css(transition, transform+' 0ms');
			var deg = Math.round((dist / flipper.width()) * 180);
			angle = this._getAngleDeg(flipper,type);
			this._setAngleDeg(flipper,type,(angle+deg));
		},

		activeScroll3D:function(obj,type,deg) {
			var transform = this.supports.transform.toLowerCase();
			var flipper = obj.find('.item-flipper');
			this.initScroll3D(obj,type);
			angle = this._getAngleDeg(flipper,type);
			flipper.css(transform,'rotate'+(type == 'horizon-scroll-3d' ? 'Y' : 'X')+'('+(angle+deg)+'deg)').data('angle',(angle+deg));
			return (angle+deg);
		},

		snapScroll3D:function(obj,type,deg) {
			var flipper = obj.find('.item-flipper');
			this.initScroll3D(obj,type);
			this._setFlip(flipper,type,deg);
		},

		_getAngleDeg:function(flipper,type) {
			var angle  = flipper.data('angle');
			if(!angle) angle = 0;
			return angle;
		},

		_setFlip:function(flipper,type,deg) {
			var self = this;
			var angle = this._getAngleDeg(flipper,type);
			var p_type = flipper.data('flip-type');
			var transition = this.supports.transition.toLowerCase();
			var transform = this.supports.transform.toLowerCase();
			var rotate = '';
			var back_rotate = '';
			var n_angle = (Math.round(parseInt(angle+deg) / 180)) * 180;

			/* initialize when container is flipped into back face and flip-type changed */
			if(taogiVMM.Browser.browser == 'Explorer') {
				var article = flipper.find('.section.article');
				var media = flipper.find('.section.media');
			}
			if(p_type && p_type != type && (angle % 360)) {
				if(type == 'horizon-scroll-3d') {
					rotate = "rotateY("+angle+"deg) rotateX(0deg)";
					if(taogiVMM.Browser.browser == 'Explorer') {
						back_rotate = "rotateY("+(angle+180)+"deg) rotateX(0deg)";
					}
				} else {
					rotate = "rotateX("+angle+"deg) rotateY(0deg)";
					if(taogiVMM.Browser.browser == 'Explorer') {
						back_rotate = "rotateX("+(angle+180)+"deg) rotateX(0deg)";
					}
				}
				flipper.data('flip-type',type);
				if(taogiVMM.Browser.browser == 'Explorer') {
					article.css({transition: transform+' 0ms', transform: rotate});
					media.css({transition: transform+' 0ms', transform: back_rotate});
				} else {
					flipper.css({transition: transform+' 0ms', transform: rotate});
				}
				flipper.data('flip-type',type);
				setTimeout(function() {
					self._setAngleDeg(flipper,type,n_angle);
				},10);
			} else {
				flipper.data('flip-type',type);
				this._setAngleDeg(flipper,type,n_angle);
			}
		},

		_setAngleDeg:function(flipper,type,deg) {
			var self = this;
			var transform = this.supports.transform.toLowerCase();
			var transition = this.supports.transition.toLowerCase();
			if(taogiVMM.Browser.browser == 'Explorer') {
				var article = flipper.find('.section.article');
				var media = flipper.find('.section.media');
				if(!article.css(transition)) {
					setTimeout(function() {
						article.css({transition: transform+" "+self.settings.transitionSpeed, transform: 'rotate'+((type == 'horizon-scroll-3d') ? 'Y' : 'X')+'('+deg+'deg)'});
						media.css({transition: transform+" "+self.settings.transitionSpeed, transform: 'rotate'+((type == 'horizon-scroll-3d') ? 'Y' : 'X')+'('+(deg+180)+'deg)'});
						flipper.data('angle',deg);
					}, 100);
				} else {
					article.css({transition: transform+" "+self.settings.transitionSpeed, transform: 'rotate'+((type == 'horizon-scroll-3d') ? 'Y' : 'X')+'('+deg+'deg)'});
					media.css({transition: transform+" "+self.settings.transitionSpeed, transform: 'rotate'+((type == 'horizon-scroll-3d') ? 'Y' : 'X')+'('+(deg+180)+'deg)'});
					flipper.data('angle',deg);
				}
			} else {
				flipper.css({transition: transform+" "+self.settings.transitionSpeed, transform: 'rotate'+(type == 'horizon-scroll-3d' ? 'Y' : 'X')+'('+deg+'deg)'}).data('angle',deg);
				if(taogiVMM.Browser.device != 'desktop') {
					var media = flipper.find('.section.media');
					if(!(deg % 360)) {
						var transitionEnd = this.supports.transitionEnd;
						setTimeout(function() {
							media.css('top','1024px');
						},self.settings.transitionSpeed);
					} else {
						media.css('top','0');
					}
				}
			}
		},

		initFade:function(obj) {
			var self = this;
			var flipper = obj.find('.item-flipper');
			var article = flipper.find('.section.article');
			var media = flipper.find('.section.media');
			if(!obj.hasClass('fade')) {
				obj.addClass('fade');
				obj.data('show',1);
				article.show();
				media.css({'display':'block'}).hide();
			} else {
			}
		},

		activeFade:function(obj) {
			this.initFade(obj);
			var flipper = obj.find('.item-flipper');
			var article = flipper.find('.section.article');
			var media = flipper.find('.section.media');
			trace("media.section : "+media.attr('id'));

			if(obj.data('show') == 1) {
				obj.data('show',0);
				article.hide();
				media.show();
			} else {
				obj.data('show',1);
				article.show();
				media.hide();
			}
		},

		_initGallery:function(index,index2,auto) {
			var self = this;
			var item = self.items[index].item;
			var container = item.find('.gallery-container');
			var isInit = parseInt(container.data('initialize'));
			var cWidth = container.width();
			var galleries = self.items[index].galleries;
			var curIndex = container.data('curIndex');
			if(typeof(curIndex) == 'undefined' || !curIndex) {
				curIndex = 0;
			}
			if(isInit !== 1 || index2 != curIndex) {
				if(typeof(index2) == 'undefined') index2 = curIndex;
				self.moveToGallery(index,index2,0,'linear');
				container.data('initialize',1)
			}

			if(item.find('.media-nav').css('position') == 'absolute') {
				taogiVMM.master_config.mediaNavHeight = this.mediaNavHeight=item.find('.media-nav').outerHeight();
			} else {
				taogiVMM.master_config.mediaNavHeight = 0;
			}
			if(self.items[index].gallery_loaded !== 1) {
				self.loadGalleryItems(index,index2,auto);
				self.items[index].gallery_loaded = 1;
				container.data('isloaded',1)
			}
			if(this._useWebkitTransition == false) {
				cWidth = item.find('.gallery-wrap').width();
				container.css('width',(galleries.length * cWidth)+'px');
				container.data('curIndex',0);
				for(i=0; i<galleries.length; i++) {
					var pos = cWidth * i;
					var gallery = galleries[i].item;
					gallery.css({'width':cWidth+'px','left':pos+'px'});
				}
			}
		},

		loadGalleryItems:function(index,index2,auto) {
			var self = this;
			for(var i=0; i<this.items[index].galleries.length; i++) {
				mediaElem = '';
				m = taogiVMM.ExternalAPI.MediaType(this.items[index].galleries[i].url);
				m.uid = this.items[index].galleries[i].uid;
				m.credit = this.items[index].galleries[i].credit;
				m.caption = this.items[index].galleries[i].caption;
				m.thumbnail = this.items[index].galleries[i].thumbnail;
				m.use_proxy = this.items[index].galleries[i].use_proxy;
				m.use_thumb_proxy = this.items[index].galleries[i].use_thumb_proxy;
				this.items[index].galleries[i].m = m;
				if(this._useWebkitTransition == true && taogiVMM.Browser.OS != 'CriOS') {
					m.wmode = 'transparent';
				} else {
					m.wmode = 'window';
				}

				if(i == index2 && auto === true) {
					m.auto = true;
				}

				mediaElem = this.createFigureElement(m,this.items[index].galleries[i]);
				if(mediaElem) {
					if(m.type == 'image' || m.type == 'instagram' || m.type == 'quote') {
						taogiVMM.alignattachElement('#'+m.uid,mediaElem,'#'+m.uid+(m.thumb ? ' .feature_image' : ''),(m.thumb ? 1 : 0));
					} else {
						taogiVMM.attachElement('#'+m.uid,mediaElem);
					}
				}
				var tn = jQuery('#t_'+m.uid);
				tn.addClass(m.type.replace(/-/i,''));
				jQuery(this.createThumbnail(m)).appendTo(tn);
			}
			taogiVMM.ExternalAPI.pushQues();
		},

		createThumbnail:function(m) {
			var mediaElem = '';
			if(m.thumbnail) {
				if(m.use_thumb_proxy) {
					m.thumbnail = './library/api.php?type=proxy&taogiauth=ACA20D8B4F7B63D8639C7824AC458D3A53F7E275&skip_referer=1&url='+encodeURIComponent(m.thumbnail);
				}
				mediaElem = '<img src="'+m.thumbnail+'" alt="'+m.caption+' '+m.credit+'" />';
			} else {
				switch(m.type) {
					case 'image':
						if(m.use_proxy) {
							m.id = './library/api.php?type=proxy&taogiauth=ACA20D8B4F7B63D8639C7824AC458D3A53F7E275&skip_referer=1&url='+encodeURIComponent(m.id);
						}
						mediaElem = '<img src="'+m.id+'" alt="'+m.caption+' '+m.credit+'" />';
						break;
					default:
						mediaElem = '<span>'+(m.caption ? m.caption : m.credit)+'</span>';
						break;
				}
			}
			return mediaElem;
		},

		/*
		 * Multimedia Gallery relative to each touchcarousel Post
		 */
		buildGallery:function(index,gindex) {
			var self = this;

			this.switchGallery(this.items[index].item,self.settings.switchGalleryMethod);
			this._initGallery(index,gindex,true);
		},

		moveToGallery:function(index,gindex,duration,easing) {
			var self = this;
			var container = this.items[index].item.find('.gallery-container');
			var galleries = this.items[index].galleries;
			var cWidth = container.width();

			if(!this.items[index].galleries[gindex]) return;
			if(this.items[index].g_animating === true) return;
			this.items[index].g_animating = true;
			var curIndex = (this.items[index].gallery_cur ? this.items[index].gallery_cur : 0);
			if(this._useWebkitTransition) {
				var delay = 0;
				var division = Math.abs(gindex - curIndex);
				if(!division) division = 1;
				duration = duration / division;
				var transition = this.supports.transition;
				for(i=0; i<galleries.length; i++) {
					this.g_animating = true;
					if(i < gindex) var pos = 0 - cWidth;
					else if(i==gindex) var pos = 0;
					else var pos = cWidth;
					var dv = Math.abs(curIndex - i);
					if(dv > 1) {
						delay = duration * (dv - 1);
					} else {
						delay = 0;
					}
					var gallery = galleries[i].item;
					gallery.css(transition, (this.supports.transform)+" "+duration.toFixed(1)+"ms "+easing+(delay ? ' '+delay.toFixed(1)+'ms' : ' 0ms'));
					gallery.css((self.supports.transform), "translate3d("+pos+"px,0px,0px)");
				}
				self._completeMovingGallery(index,gindex);
			} else {
				var cWidth = (cWidth / galleries.length);
				var moveTo = (-1)*(cWidth * gindex);
				if(!duration) {
					container.css('left',moveTo+'px');
					this._completeMovingGallery(index,gindex);
				} else {
					from = {containerPos : (-1) * curIndex * cWidth};
					to = {containerPos : (-1) * gindex * cWidth};
					jQuery(from).animate(to, {
						duration: duration,
						easing: $.cssEase[(easing ? easing : self.settings.easingAtGalleryMove)],
						step: function() {
							trace("containerPos : "+this.containerPos);
							container.css('left',this.containerPos+'px');
						},
						complete: function() {
							container.css('left',to.containerPos+'px');
							self._completeMovingGallery(index,gindex);
						}
					});
				}
			}
		},

		_completeMovingGallery:function(index,gindex) {
			this.items[index].currGalleryIndex = gindex;
			this.items[index].gallery_cur = gindex;
			this.items[index].item.find('.gallery-container').data('curIndex',gindex);
			jQuery('#t_'+this.items[index].galleries[gindex].uid).addClass('current').siblings().removeClass('current');
			taogiVMM.Util.alignMiddle('#'+this.items[index].galleries[gindex].uid,0);
			var caption = this.items[index].galleries[gindex].caption;
			if(this.items[index].galleries[gindex].credit)
				caption += '<span class="split"> - </span><cite>'+this.items[index].galleries[gindex].credit + '</cite>';
			this.items[index].gallery.find('.media-nav .caption').html(caption);
			this.items[index].g_animating = false;
		},

		toggleContainer:function() {
			var self = this;
			if(self.settings.useToggleContainer && self.settings.ToggleContainer) {
				var container = jQuery('#'+this.settings.ToggleContainer);
				var container_h = container.height();
				jQuery('.carousel-timeline-toggle').click(function(e) {
					e.preventDefault();
					container.data('hidden',false);
					if(parseInt(container.css('top')) < 0) { 
						jQuery('body').css("overflow", "hidden");
						container.animate({top:0}, self.settings.fadeSpeed,function() {
							container.data('hidden',false);
						});  
					} else {
						self._disableCoverTitle();
						container.animate({top:'-'+container_h+'px'}, self.settings.fadeSpeed, function() {					  
							container.data('hidden',true); 
							jQuery('body').css("overflow", "auto");
						});
					}
				});
			}
		},

		resizeGallery:function() {
			for(var i=1; i<=this.totalItemCnt; i++) {
				if(this.items[i].gallery_loaded) {
					for(var j=0;  j<this.items[i].galleries.length; j++) {
						this.resizeFigureElement(this.items[i].galleries[j].m);
					}
					this.moveToGallery(i,this.items[i].gallery_cur,0);
				}
			}
		},

		destroy: function() {
			this._TLContainer.swipe('disable');
			this.scrollbarWrap.swipe('disable');
		}
	}

	$.fn.taogiTouchCarousel = function(options) {
		return this.each(function() {
			var taogiTouchCarousel = new TaogiTouchCarousel(jQuery(this),options);
			jQuery(this).data("taogiTouchCarousel",taogiTouchCarousel);
		});
	};

	$.fn.taogiTouchCarousel.defaults = {
		useWebkitTransition: true,
		scrollbar: true,
		scrollbar_thmeme: 'theme1',
		transitionSpeed: 600,
		directionNav:true,
		keyboard:true,
		threshold: 50,
		clickElements: 'a, .taogi_buildGallery, li.thumbnail',
		triggerOnTouchEnd: true,
		allowPageScroll: 'auto',
		swipeUsingMouse: true,
		MouseFriction: 0.0008,
		TouchFriction: 0.0008,
		fadeSpeed: 'slow',
		useToggleContainer: 'false',
		ToggleContainer:'',
		switchGalleryMethod:'horizon-scroll-3d',
		fingerSwitchGalleryMethod:'vertical-scroll-3d',
		switchGalleryDirection: 'reverse',
		Perspective:1000,
		maxfigureItemNum:	   0,
		maptype:				"TERRAIN",
		api_keys: {
			google:			 "",
			flickr:			 "",
			twitter:			""
		},
		feature: {
			width:			  444,
			height:			 252
		},
		thumb: {
			width:			  216,
			height:			 252
		},
		language:			   'kr',
		Gmarkup: '<div id="carousel-timeline-fancy"> \
			<div class="carousel-timeline-fancy-overlay"> \
			</div> \
			<div class="carousel-timeline-fancy-container"> \
				<div class="carousel-timeline-fancy-inner-container"> \
					<div class="carousel-timeline-post-navi prev"> \
						<span>Prev Post</span> \
					</div> \
					<div class="carousel-timeline-fancyBox-list-container"> \
						<ul class="carousel-timeline-fancyBox-list"> \
						</ul> \
					</div> \
					<div class="carousel-timeline-post-navi next"> \
						<span>Next Post</span> \
					</div> \
					<div class="close"><span>x</span></div> \
				</div> \
			</div> \
		</div>',
		Smarkup: '<h1 id="taogi-timeline-title" class="taogi-gnb-switch"><a class="switch" href="#gnb">Menu</a><span></span></h1>',
		Pmarkup: '<li class="carousel-timeline-fancyBox"> \
								<div class="fancyBox-title"> \
									<time class="pubdate"></time> \
									<div class="shareBox"> \
									</div> \
								</div> \
								<div class="carousel-timeline-fancyBox-container taogi_theme_background"> \
									<div class="loading"> \
									</div> \
								</div> \
							</li>',
		Lmarkup: '<div class="carousel-timeline-fancyBox-container taogi_theme_background"> \
							<div class="carousel-timeline-fancyBox-box"> \
								<div class="carousel-timeline-fancyBox-navi prev"> \
									<span>Prev Multimedia</span> \
								</div> \
								<div class="carousel-timeline-fancyBox-figure"> \
									<ul> \
									</ul> \
								</div> \
								<div class="carousel-timeline-fancyBox-navi next"> \
									<span>Next Multimedia</span> \
								</div> \
							</div> \
							<div class="carousel-timeline-fancyBox-thumb"> \
								<div class="carousel-timeline-fancyBox-thumb-navi prev"> \
									<span>Prev</span> \
								</div> \
								<ul class="carousel-timeline-fancyBox-thumb-list"> \
								</ul> \
								<div class="carousel-timeline-fancyBox-thumb-navi next"> \
									<span>Next</span> \
								</div> \
							</div> \
						</div>',
		Fmarkup: '<li><figure></figure></li>',
		Tmarkup: '<li></li>',
		easingAtGalleryCreate : 'easeInOutExpo',
		easingAtGalleryMove : 'easeOutCubic',
		transitionSpeedAtSlider: 800
	}

	$.fn.taogiTouchCarousel.settings = {};
})(jQuery);
