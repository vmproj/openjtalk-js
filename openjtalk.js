var exec = require('child_process').exec
  , path = require('path')
  , uuid = require('uuid-v4')
;

// デフォルトパラメタ
var DefaultOptions = {
	openjtalk_bin : path.join(__dirname, '/bin/open_jtalk'),
	dic_dir       : path.join(__dirname, '/dic/open_jtalk_dic_utf_8-1.09'),
	htsvoice      : path.join(__dirname, '/voice/mei/mei_normal.htsvoice'),
	wav_dir       : '.',
};

// OpenJTalk で wav ファイルを生成するクラス
var OpenJTalk = function(args) {
	var args = args || {};
	var options = DefaultOptions;
	for (var key in args) {
		options[key] = args[key];
	}
	for (var key in options) {
		this[key] = options[key];
	}
};

OpenJTalk.prototype = {
	// 喋らせる
	talk : function (str /*, [pitch, [callback]] */) {
		// 引数の展開
		var pitch    = this.pitch
		  , callback = null
		;
		if (typeof(arguments[1]) == 'number') {
			pitch = arguments[1];
		}
		for (var i = 1; i <= 2; ++i) {
			if ( typeof(arguments[i]) == 'function' ) {
				callback = arguments[i];
				break;
			}
		}
		this._makeWav(str, pitch, function(err, result) {
			if (err) {
				if (callback) callback(err, null);
				return;
			}
			this._play(result.wav, callback);
		}.bind(this));
	},

	// wav を再生する
	_play : function(wavFileName, callback) {
		// escape
		wavFileName = wavFileName.split(/\s/).join('');

		var player;
		switch (process.platform) {
			case 'darwin' : player = 'afplay'; break;
			case 'linux'  : player = 'aplay';  break;
			default       : player = 'play';   break;
		}
		var cmd = player+ ' ' + wavFileName + '&& rm ' + wavFileName;
		exec(cmd, function(err, stdout, stderr) {
			if (callback) callback(err, stdout, stderr);
		});
	},

	// exec から open_jtalk を実行して wav ファイルを作る
	_makeWav : function (str, pitch, callback) {
		var wavFileName = uuid() + '.wav';

		var ojtCmd = this.openjtalk_bin;
		var options = {
			m  : this.htsvoice,
			x  : this.dic_dir,
			s  : this.sampling_rate,
			p  : pitch,
			a  : this.alpha,
			b  : this.beta,
			u  : this.uv_threshold,
			jm : this.gv_weight_mgc,
			jf : this.gv_weight_lf0,
			z  : this.audio_buff_size,
			ow : path.join(this.wav_dir, wavFileName)
			ot : 'open_jtalk.log'
		};
		for (var option in options) {
			var value = options[option];
			if (value) {
				ojtCmd += ' -' + option + ' ' + value;
			}
		}

		var cmd = 'echo "' + str + '" | ' + ojtCmd;
		exec(cmd, function(err, stdout, stderr) {
			var result = {
				stdout : stdout,
				stderr : stderr,
				wav    : wavFileName
			};
			if (callback) callback(err, result);
		});
		var cmd = 'cat open_jtalk.log'
		exec(cmd, function(error, stdout, stderr) {
			// シェル上でコマンドを実行できなかった場合のエラー処理
			if (error !== null) {
			  console.log('exec error: ' + error);
			  return;
			}
			// シェル上で実行したコマンドの標準出力が stdout に格納されている
			console.log('stdout: ' + stdout);
		});
	}
};

module.exports = OpenJTalk;
