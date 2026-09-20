import { ServerApi } from 'ograf'
import { GraphicInfo } from './GraphicInstance.js'

export class GraphicCache {
	private cachedGraphicInfo: Record<
		string,
		ServerApi.paths['/graphics/{graphicId}']['get']['responses']['200']['content']['application/json']
	> = {}
	private elementNames: Map<string, string> = new Map()
	constructor(private serverApiUrl: string) {}

	/**
	 * A custom element name must begin with a lowercase ASCII letter and must
	 * contain a hyphen. An OGraf Graphic id need not: the specification
	 * recommends reverse domain notation, and an id such as
	 * "dev.ograf.tutorial.ticker" is perfectly legal while being an illegal tag
	 * name. So derive a name from the id rather than assuming it is one.
	 */
	private elementNameFor(graphicId: string): string {
		const known = this.elementNames.get(graphicId)
		if (known) return known

		let name = graphicId.toLowerCase().replace(/[^a-z0-9._-]/g, '-')
		if (!/^[a-z]/.test(name)) name = `g-${name}`
		if (!name.includes('-')) name = `${name}-graphic`

		// Two ids that differ only where the rules above do not can still
		// reduce to the same name, and defining one twice throws.
		const taken = new Set(this.elementNames.values())
		let unique = name
		for (let n = 2; taken.has(unique); n++) unique = `${name}-${n}`

		this.elementNames.set(graphicId, unique)
		return unique
	}

	async loadGraphic(graphicId: string): Promise<{
		elementName: string
		graphicInfo: GraphicInfo
	}> {
		const elementName = this.elementNameFor(graphicId)

		// Check if the Graphic is already registered:
		const cachedGraphic = customElements.get(elementName)
		const cachedGraphicInfo = this.cachedGraphicInfo[graphicId]
		if (cachedGraphic && cachedGraphicInfo) return { elementName, graphicInfo: cachedGraphicInfo }

		console.log(`Loading Graphic "${graphicId}"`)

		console.log(`Loading manifest...`)
		const graphicInfo = await this.fetchGraphicInfo(graphicId)

		this.cachedGraphicInfo[graphicId] = graphicInfo

		// Load the Graphic:
		console.log(`Loading Graphic...`, graphicInfo)
		const webComponent = await this.fetchModule(graphicId, graphicInfo.graphic)

		// register the web component
		customElements.define(elementName, webComponent)

		return {
			elementName,
			graphicInfo,
		}
	}
	private async fetchGraphicInfo(graphicId: string): Promise<GraphicInfo> {
		const url = `${this.serverApiUrl}/ograf/v1/graphics/${graphicId}`

		const response = await fetch(url)
		if (response.status === 200) {
			const responseData = await response.json()

			if (!responseData.graphic) throw new Error('No "graphic" property found in response')
			if (!responseData.metadata) throw new Error('No "metadata" property found in response')

			return responseData
		} else {
			throw new Error(`Failed to load manifest from ${url}: [${response.status}] ${JSON.stringify(response.body)}`)
		}
	}
	async fetchModule(
		id: string,
		manifest: ServerApi.components['schemas']['schema-2']
	): Promise<CustomElementConstructor> {
		const modulePath = `${this.serverApiUrl}/serverApi/internal/graphics/${id}/${manifest.main ?? 'graphic.mjs'}`

		// Load the Graphic module:
		const module = await import(modulePath)

		if (!module.default) {
			const exportKeys = Object.keys(module)

			if (exportKeys.length) {
				throw new Error(
					`The Graphic is expected to export a class as a default export. ${
						exportKeys.length === 1
							? `Instead there is a export called "${exportKeys[0]}". Change this to be "export default ${exportKeys[0]}".`
							: `Instead there are named exports: ${exportKeys.join(', ')}.`
					}`
				)
			} else {
				throw new Error('Module expected to export a class as a default export (no exports found)')
			}
		}
		if (typeof module.default !== 'function') {
			throw new Error('The Graphic is expected to default export a class')
		}

		return module.default
	}
}
