import httpx
def test_get_urls(client):
    response = client.get("/urls")

    assert response.status_code == 200
    assert response.json() == []

def test_create_url(client):
    response = client.post(
        "/urls",
        json={"url": "https://github.com"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["url"] == "https://github.com/"
    assert data["is_active"] is True

def test_create_duplicate_url(client):
    first_response = client.post(
        "/urls",
        json={"url": "https://github.com"},
    )

    assert first_response.status_code == 200

    second_response = client.post(
        "/urls",
        json={"url": "https://github.com"},
    )

    assert second_response.status_code == 409

def test_get_url_by_id(client):
    create_response = client.post(
        "/urls",
        json={"url": "https://github.com"},
    )

    assert create_response.status_code == 200

    created_url = create_response.json()
    url_id = created_url["id"]

    response = client.get(f"/urls/{url_id}")

    assert response.status_code == 200
    assert response.json()["id"] == url_id
    assert response.json()["url"] == "https://github.com/"
    assert response.json()["is_active"] is True

def test_get_url_not_found(client):
    response = client.get("/urls/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Нет такого URL"

def test_delete_url(client):
    create_response = client.post(
        "/urls",
        json={"url": "https://github.com"},
    )

    assert create_response.status_code == 200

    url_id = create_response.json()["id"]

    delete_response = client.delete(f"/urls/{url_id}")

    assert delete_response.status_code == 200
    assert delete_response.json() is True

    get_response = client.get(f"/urls/{url_id}")

    assert get_response.status_code == 404

def test_delete_url_not_found(client):
    response = client.delete("/urls/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Нет такого URL"

def test_check_url(client, monkeypatch):
    create_response = client.post(
        "/urls",
        json={"url": "https://github.com"},
    )

    assert create_response.status_code == 200

    url_id = create_response.json()["id"]

    class FakeResponse:
        status_code = 200

    def fake_get(url, timeout):
        return FakeResponse()

    monkeypatch.setattr(
        "app.services.url_check_service.httpx.get",
        fake_get,
    )

    response = client.post(f"/urls/{url_id}/check")

    assert response.status_code == 200

    data = response.json()

    assert data["url_id"] == url_id
    assert data["status_code"] == 200
    assert data["success"] is True
    assert data["response_time"] >= 0

def test_fake_connection_failed(client, monkeypatch):
    create_response = client.post(
        '/urls',
        json={"url": "https://github.com"}
    )

    assert create_response.status_code == 200

    url_id = create_response.json()['id']

    def fake_get(url, timeout):
        raise httpx.RequestError("Connection failed")

    monkeypatch.setattr(
        "app.services.url_check_service.httpx.get",
        fake_get,
    )

    response = client.post(f"/urls/{url_id}/check")

    assert response.status_code == 200

    data = response.json()

    assert data["url_id"] == url_id
    assert data["status_code"] is None
    assert data["success"] is False
    assert data["response_time"] >= 0

def test_get_url_checks(client, monkeypatch):
    create_response = client.post(
        "/urls",
        json={"url": "https://github.com"},
    )

    assert create_response.status_code == 200

    url_id = create_response.json()["id"]

    class FakeResponse:
        status_code = 200

    def fake_get(url, timeout):
        return FakeResponse()

    monkeypatch.setattr(
        "app.services.url_check_service.httpx.get",
        fake_get,
    )

    check_response = client.post(f"/urls/{url_id}/check")

    assert check_response.status_code == 200

    response = client.get(f"/urls/{url_id}/checks")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["url_id"] == url_id
    assert data[0]["status_code"] == 200
    assert data[0]["success"] is True


def test_get_empty_url_checks(client):
    create_response = client.post(
        "/urls",
        json={"url": "https://github.com"},
    )

    assert create_response.status_code == 200

    url_id = create_response.json()["id"]

    response = client.get(f"/urls/{url_id}/checks")

    assert response.status_code == 200
    assert response.json() == []

def test_get_url_checks_not_found(client):
    response = client.get("/urls/999999/checks")

    assert response.status_code == 404
    assert response.json()["detail"] == "Нет такого URL"


def test_get_multiple_url_checks(client, monkeypatch):
    create_response = client.post(
        "/urls",
        json={"url": "https://github.com"},
    )

    assert create_response.status_code == 200

    url_id = create_response.json()["id"]

    class FakeResponse:
        status_code = 200

    def fake_get(url, timeout):
        return FakeResponse()

    monkeypatch.setattr(
        "app.services.url_check_service.httpx.get",
        fake_get,
    )

    first_check = client.post(f"/urls/{url_id}/check")
    second_check = client.post(f"/urls/{url_id}/check")

    assert first_check.status_code == 200
    assert second_check.status_code == 200

    response = client.get(f"/urls/{url_id}/checks")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 2
    assert data[0]["url_id"] == url_id
    assert data[1]["url_id"] == url_id