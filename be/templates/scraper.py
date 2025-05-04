import requests
from bs4 import BeautifulSoup
import json
from svgtry import svg_to_graph

# Prefixes that denote solution variants under an H3
SPECIAL_PREFIXES = ("Bad Solution", "Good Solution", "Great Solution")


def scrape_bitly_page(url):
    """
    Fetches the Bitly design-breakdown page and returns nested JSON:
      H2 titles -> {content: [], subsections: { H3: { content: [], <Solution>: { content: [], <H6>: { content: [] } } } }}
    Embedded figures are captured in each dict under a 'figures' key.
    """
    resp = requests.get(url)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    data = {}
    current_h2 = None
    current_h3 = None
    h3_special = None
    h6_special = None

    for el in soup.find_all(["h2", "h3", "h6", "p", "pre", "ul", "ol", "object", "div"]):
        # skip until first H2
        if current_h2 is None and el.name != "h2":
            continue

        # H2: new section
        if el.name == "h2":
            current_h2 = el.get_text(strip=True)
            data[current_h2] = {"content": [], "subsections": {}}
            current_h3 = h3_special = h6_special = None
            continue

        # H3: new subsection or solution variant
        if el.name == "h3":
            text = el.get_text(strip=True)
            # solution variant under existing H3
            if current_h3 and any(text.startswith(pref) for pref in SPECIAL_PREFIXES):
                h3_special = text
                data[current_h2]["subsections"][current_h3].setdefault(h3_special, {"content": []})
                h6_special = None
            else:
                # start new H3
                current_h3 = text
                data[current_h2]["subsections"][current_h3] = {"content": []}
                h3_special = h6_special = None
            continue

        # H6: Approach/Challenges under H3 or its solution
        if el.name == "h6":
            text = el.get_text(strip=True)
            print(text)
            x = ["Not sure where your gaps are?", "Questions", "Links", "Legal", "Contact"]
            if text in x:
                continue
            # determine container dict
            if h3_special:
                sect = data[current_h2]["subsections"][current_h3][h3_special]
            else:
                sect = data[current_h2]["subsections"][current_h3]
            # initialize H6 key as dict
            sect.setdefault(text, {"content": []})
            h6_special = text
            continue

        # figures (SVG <object>)
        if el.name == "object":
            src = el.get("data")
            print(src)
            URL = "https://www.hellointerview.com" + src
            graph = svg_to_graph(URL)
            src = graph
            caption = el.get("aria-label", "")
            # pick container dict
            if h6_special:
                if h3_special:
                    container = data[current_h2]["subsections"][current_h3][h3_special][h6_special]
                else:
                    container = data[current_h2]["subsections"][current_h3][h6_special]
            elif h3_special:
                container = data[current_h2]["subsections"][current_h3][h3_special]
            elif current_h3:
                container = data[current_h2]["subsections"][current_h3]
            else:
                container = data[current_h2]
            # store figures list
            container.setdefault("figures", []).append({"src": src, "caption": caption})
            continue

        # lists
        if el.name in ("ul", "ol"):
            items = [li.get_text(strip=True) for li in el.find_all("li") if li.get_text(strip=True)]
            if current_h3 is None:
                data[current_h2]["content"].extend(items)
            else:
                if h6_special:
                    sect = (data[current_h2]["subsections"][current_h3][h3_special][h6_special]
                            if h3_special else data[current_h2]["subsections"][current_h3][h6_special])
                    sect["content"].extend(items)
                elif h3_special:
                    data[current_h2]["subsections"][current_h3][h3_special]["content"].extend(items)
                else:
                    data[current_h2]["subsections"][current_h3]["content"].extend(items)
            continue

        # paragraphs, code, and body-text divs
        is_body_div = el.name == "div" and el.get("class") and "MuiTypography-body1" in el.get("class")
        if el.name in ("p", "pre") or is_body_div:
            txt = el.get_text(strip=True)
            if not txt:
                continue
            if current_h3 is None:
                data[current_h2]["content"].append(txt)
            else:
                if h6_special:
                    sect = (data[current_h2]["subsections"][current_h3][h3_special][h6_special]
                            if h3_special else data[current_h2]["subsections"][current_h3][h6_special])
                    sect["content"].append(txt)
                elif h3_special:
                    data[current_h2]["subsections"][current_h3][h3_special]["content"].append(txt)
                else:
                    data[current_h2]["subsections"][current_h3]["content"].append(txt)
            continue

    return data


if __name__ == "__main__":
    URL = "https://www.hellointerview.com/learn/system-design/problem-breakdowns/whatsapp"
    result = scrape_bitly_page(URL)
    with open("whatsapp.json", "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    # print(json.dumps(result, indent=2, ensure_ascii=False))