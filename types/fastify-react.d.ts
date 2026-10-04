// @fastify/react ships no type declarations of its own.
declare module '@fastify/react' {
  import type { FastifyPluginCallback } from 'fastify'

  const renderer: FastifyPluginCallback
  export default renderer
}

declare module '@fastify/react/plugin' {
  import type { PluginOption } from 'vite'

  export default function viteFastifyReact(options?: Record<string, unknown>): PluginOption
}
