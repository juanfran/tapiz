import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';

const PORT = 4300;

const fastify = Fastify({
  logger: true,
  maxParamLength: 5000,
});

console.log(path.join(import.meta.dirname, '../../../dist/apps/web'));

fastify.register(fastifyStatic, {
  root: path.join(import.meta.dirname, '../../../dist/apps/web'),
  wildcard: false,
});

fastify.get('/*', async (_, reply) => {
  return reply.sendFile('index.html');
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT });
    console.log(`http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
