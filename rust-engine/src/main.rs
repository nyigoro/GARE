use std::fs;
use std::env;
use std::io::{BufRead, BufReader, Stdin};
use std::process::Stdio;
use serde::Deserialize;
use tokio::io::AsyncBufReadExt;
use tokio::process::Command;
use which::which;

#[derive(Deserialize)]
struct RunRequest {
    engine: String,
    url: String,
}

#[derive(Deserialize)]
struct EngineConfig {
    name: String,
    command: String,
    args: Vec<String>,
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();
    if args.contains(&"--version".to_string()) {
        println!("GARE Runner v0.1.0");
        return;
    }

    let stdin = std::io::stdin();
    let mut reader = BufReader::new(stdin);
    let mut input = String::new();

    while reader.read_line(&mut input).unwrap_or(0) > 0 {
        if let Ok(req) = serde_json::from_str::<RunRequest>(&input.trim()) {
            run_engine(req).await;
        }
        input.clear();
    }
}

async fn run_engine(req: RunRequest) {
    let config_path = format!("engines/{}.json", req.engine);
    let config_str = fs::read_to_string(&config_path).expect("Engine config missing");
    let engine: EngineConfig = serde_json::from_str(&config_str).expect("Invalid engine config");

    let command_path = which(&engine.command).expect("Command not found");
    let args: Vec<String> = engine.args.iter()
        .map(|arg| arg.replace("${url}", &req.url))
        .collect();

    let mut cmd = Command::new(&command_path);
    cmd.args(&args)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

  println!("Launching: {} {:?}", command_path.display(), args);

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Failed to start: {}", e);
            return;
        }
    };

    if let Some(stdout) = child.stdout.take() {
        let reader = tokio::io::BufReader::new(stdout).lines();
        tokio::pin!(reader);
        while let Ok(Some(line)) = reader.next_line().await {
            println!("{}", line);
        }
    }

    if let Some(stderr) = child.stderr.take() {
        let reader = tokio::io::BufReader::new(stderr).lines();
        tokio::pin!(reader);
        while let Ok(Some(line)) = reader.next_line().await {
            eprintln!("{}", line);
        }
    }

    let _ = child.wait().await;
}
