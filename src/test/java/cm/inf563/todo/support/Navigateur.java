package cm.inf563.todo.support;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.SimpleFileServer;
import io.cucumber.java.After;
import io.cucumber.java.AfterAll;
import io.cucumber.java.Before;
import io.cucumber.java.BeforeAll;
import io.cucumber.java.Scenario;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Infrastructure des scénarios :
 * <ul>
 *   <li>un serveur HTTP local (SimpleFileServer du JDK) sert src/main/webapp sur un port libre :
 *       IndexedDB exige une vraie origine http:// ;</li>
 *   <li>un seul Chromium pour toute la suite ;</li>
 *   <li>un contexte de navigation neuf par scénario : IndexedDB vide, scénarios isolés et rejouables.</li>
 * </ul>
 * Options : {@code -Dheadless=false} pour voir le navigateur, {@code -DslowMo=300} pour ralentir.
 */
public class Navigateur {

    private static HttpServer serveur;
    private static String urlApplication;
    private static Playwright playwright;
    private static Browser chromium;

    private final List<String> erreursJavaScript = new ArrayList<>();
    private BrowserContext contexte;
    private Page page;

    @BeforeAll
    public static void demarrer() {
        Path racine = Path.of("src", "main", "webapp").toAbsolutePath();
        serveur = SimpleFileServer.createFileServer(
                new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), racine, SimpleFileServer.OutputLevel.NONE);
        serveur.start();
        urlApplication = "http://127.0.0.1:" + serveur.getAddress().getPort() + "/index.html";

        playwright = Playwright.create();
        chromium = playwright.chromium().launch(new BrowserType.LaunchOptions()
                .setHeadless(Boolean.parseBoolean(System.getProperty("headless", "true")))
                .setSlowMo(Double.parseDouble(System.getProperty("slowMo", "0"))));
    }

    @AfterAll
    public static void arreter() {
        chromium.close();
        playwright.close();
        serveur.stop(0);
    }

    @Before
    public void ouvrirContexte() {
        contexte = chromium.newContext(new Browser.NewContextOptions().setLocale("fr-FR"));
        contexte.setDefaultTimeout(10_000);
        page = nouvellePage();
    }

    private Page nouvellePage() {
        Page nouvelle = contexte.newPage();
        // Une erreur JavaScript non interceptée doit faire échouer le scénario, pas passer inaperçue
        nouvelle.onPageError(erreursJavaScript::add);
        return nouvelle;
    }

    @After
    public void fermerContexte(Scenario scenario) {
        if (scenario.isFailed() && !page.isClosed()) {
            scenario.attach(page.screenshot(new Page.ScreenshotOptions().setFullPage(true)),
                    "image/png", "capture au moment de l'echec");
        }
        contexte.close();
        if (!erreursJavaScript.isEmpty()) {
            throw new AssertionError("Erreur(s) JavaScript dans l'application : " + erreursJavaScript);
        }
    }

    /** Ferme l'onglet courant et en ouvre un autre dans le même profil (même stockage IndexedDB). */
    public void changerDOnglet() {
        page.close();
        page = nouvellePage();
    }

    public Page page() {
        return page;
    }

    public String urlApplication() {
        return urlApplication;
    }
}
