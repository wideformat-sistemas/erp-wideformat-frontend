import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

const serviceAccount = JSON.parse(
    fs.readFileSync('./serviceAccountKey.json', 'utf8')
);

initializeApp({
    credential: cert(serviceAccount)
});

async function enableTotp() {
    try {
        await getAuth().projectConfigManager().updateProjectConfig({
            multiFactorConfig: {
                providerConfigs: [{
                    state: "ENABLED",
                    totpProviderConfig: {
                        adjacentIntervals: 5
                    }
                }]
            }
        });
        console.log("¡ÉXITO! TOTP MFA habilitado correctamente en tu proyecto de Firebase.");
    } catch (error) {
        console.error("Error al habilitar TOTP:", error);
    }
}

enableTotp();