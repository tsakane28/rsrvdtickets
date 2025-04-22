/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	webpack: (config, { isServer }) => {
		// Handle Node.js modules used by Paynow
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
				crypto: require.resolve('crypto-browserify'),
				stream: require.resolve('stream-browserify'),
				http: require.resolve('stream-http'),
				https: require.resolve('https-browserify'),
				zlib: require.resolve('browserify-zlib'),
				path: require.resolve('path-browserify'),
				url: require.resolve('url'),
				util: require.resolve('util/'),
				buffer: require.resolve('buffer/'),
			};
			config.plugins.push(
				new (require('webpack')).ProvidePlugin({
					process: 'process/browser',
					Buffer: ['buffer', 'Buffer'],
				})
			);
		}
		return config;
	},
};

module.exports = nextConfig;
