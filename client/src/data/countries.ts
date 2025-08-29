// Tipos e uma lista compacta (adicione mais se quiser)
export type Country = {
    iso2: string       // código ISO 3166-1 alpha-2
    name: string
    dial: string       // DDI sem o +
    mask: string       // máscara do número nacional usando # como dígito
    example: string    // só para placeholder
}

export const COUNTRIES: Country[] = [
    { iso2: 'BR', name: 'Brasil', dial: '55', mask: '(##) #####-####', example: '+55 (11) 91234-5678' },
    { iso2: 'US', name: 'United States', dial: '1', mask: '(###) ###-####', example: '+1 (415) 555-0134' },
    { iso2: 'CA', name: 'Canada', dial: '1', mask: '(###) ###-####', example: '+1 (416) 555-0199' },
    { iso2: 'PT', name: 'Portugal', dial: '351', mask: '#### ### ###', example: '+351 912 345 678' },
    { iso2: 'ES', name: 'España', dial: '34', mask: '### ### ###', example: '+34 612 345 678' },
    { iso2: 'GB', name: 'United Kingdom', dial: '44', mask: '#### ######', example: '+44 7700 900123' },
    { iso2: 'AR', name: 'Argentina', dial: '54', mask: '(##) ####-####', example: '+54 (11) 4321-1234' },
]