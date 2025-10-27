/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,
	experimental: {
		typedRoutes: true,
		serverActions: {
			enabled: true,
		},
	},
};

export default config;
